import cv2
import json
import time
import uuid
import threading
import queue
import logging
from pathlib import Path
from collections import defaultdict, deque
from datetime import datetime

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from src.detection.yolo_detector import YOLODetector
from src.tracking.sort_tracker import SORTTracker

# ── Config ──────────────────────────────────────────────────────────────────
MODEL_PATH  = "models/yolo11n_finetuned.pt"
UPLOAD_DIR  = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# BDD100K → frontend class names
CLASS_MAP = {
    "person":        "pedestrian",
    "rider":         "pedestrian",
    "car":           "car",
    "bus":           "bus",
    "truck":         "truck",
    "bike":          "bicycle",
    "motor":         "motorcycle",
    "traffic light": "traffic light",
    "traffic sign":  "traffic sign",
    "train":         "train",
}

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)

# ── Shared state ─────────────────────────────────────────────────────────────
state = {
    "running":       False,
    "video_path":    None,
    "frame_id":      0,
    "total":         0,
    "unique_ids":    set(),
    "class_counts":  defaultdict(int),
    "logs":          deque(maxlen=200),
    "hourly":        defaultdict(int),
    "latency_ms":    0.0,
}
event_queue: queue.Queue = queue.Queue(maxsize=50)
state_lock = threading.Lock()


# ── Detection thread ─────────────────────────────────────────────────────────
def detection_loop(video_path: str):
    detector = YOLODetector(model_path=MODEL_PATH, confidence_threshold=0.5)
    tracker  = SORTTracker()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logging.error(f"Cannot open video: {video_path}")
        return

    with state_lock:
        state["running"]      = True
        state["frame_id"]     = 0
        state["total"]        = 0
        state["unique_ids"]   = set()
        state["class_counts"] = defaultdict(int)
        state["logs"]         = deque(maxlen=200)

    while state["running"]:
        t0 = time.time()
        ok, frame = cap.read()
        if not ok:
            break

        results = detector.model.track(
            frame,
            conf=detector.confidence_threshold,
            persist=True,
            verbose=False,
        )[0]

        detections = tracker.update(results, detector.class_names)
        latency = round((time.time() - t0) * 1000, 1)

        hour_key = datetime.now().strftime("%H:00")
        objects  = []

        with state_lock:
            state["frame_id"] += 1
            state["latency_ms"] = latency

            if not detections:
                state["hourly"][hour_key] += 0
            else:
                state["hourly"][hour_key] += len(detections)
                state["total"] += len(detections)

            for det in detections:
                raw_cls  = det["class_name"]
                frontend_cls = CLASS_MAP.get(raw_cls, raw_cls)
                tid      = det["track_id"]
                conf     = det["confidence"]
                x1, y1, x2, y2 = det["bbox"]

                h, w = frame.shape[:2]
                bbox_norm = [
                    round(x1 / w, 3),
                    round(y1 / h, 3),
                    round((x2 - x1) / w, 3),
                    round((y2 - y1) / h, 3),
                ]

                state["unique_ids"].add(f"{frontend_cls}-{tid}")
                state["class_counts"][frontend_cls] += 1

                obj = {
                    "id":         f"TRK-{tid:04d}",
                    "class":      frontend_cls,
                    "confidence": round(conf, 4),
                    "bbox":       bbox_norm,
                    "timestamp":  int(time.time() * 1000),
                }
                objects.append(obj)

                state["logs"].appendleft({
                    **obj,
                    "frame_id": state["frame_id"],
                })

        payload = json.dumps({"objects": objects, "frame_id": state["frame_id"]})
        try:
            event_queue.put_nowait(payload)
        except queue.Full:
            pass

    cap.release()
    with state_lock:
        state["running"] = False
    logging.info("Detection loop stopped.")


# ── API routes ────────────────────────────────────────────────────────────────

@app.post("/api/upload")
def upload_video():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400

    ext  = Path(f.filename).suffix.lower()
    if ext not in {".mp4", ".avi", ".mov", ".mkv"}:
        return jsonify({"error": "Unsupported format"}), 400

    name = f"{uuid.uuid4().hex}{ext}"
    path = UPLOAD_DIR / name
    f.save(path)

    with state_lock:
        state["video_path"] = str(path)

    return jsonify({"message": "Upload successful", "video": name})


@app.post("/api/detect/start")
def start_detection():
    with state_lock:
        if state["running"]:
            return jsonify({"error": "Already running"}), 409
        video = state.get("video_path")

    if not video:
        return jsonify({"error": "No video uploaded"}), 400

    t = threading.Thread(target=detection_loop, args=(video,), daemon=True)
    t.start()
    return jsonify({"message": "Detection started"})


@app.post("/api/detect/stop")
def stop_detection():
    with state_lock:
        state["running"] = False
    return jsonify({"message": "Detection stopped"})


@app.get("/api/stream")
def stream():
    """Server-Sent Events — frontend subscribes with EventSource."""
    def generate():
        yield "retry: 1000\n\n"
        while True:
            try:
                payload = event_queue.get(timeout=2)
                yield f"data: {payload}\n\n"
            except queue.Empty:
                yield ": ping\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/stats")
def get_stats():
    with state_lock:
        return jsonify({
            "live_count":   len([l for l in list(state["logs"])[:10] if l["frame_id"] == state["frame_id"]]),
            "unique_count": len(state["unique_ids"]),
            "total":        state["total"],
            "latency_ms":   state["latency_ms"],
            "running":      state["running"],
            "class_counts": dict(state["class_counts"]),
        })


@app.get("/api/logs")
def get_logs():
    limit = int(request.args.get("limit", 100))
    with state_lock:
        logs = list(state["logs"])[:limit]
    return jsonify(logs)


@app.get("/api/analytics")
def get_analytics():
    with state_lock:
        hourly = dict(state["hourly"])
        class_counts = dict(state["class_counts"])

    total = sum(class_counts.values()) or 1
    distribution = [
        {"name": cls.capitalize(), "value": round(cnt / total * 100), "color": _color(cls)}
        for cls, cnt in sorted(class_counts.items(), key=lambda x: -x[1])
    ]

    density = [
        {"time": h, "count": c}
        for h, c in sorted(hourly.items())
    ]

    return jsonify({"density": density, "distribution": distribution})


def _color(cls: str) -> str:
    colors = {
        "car":         "#3b82f6",
        "bus":         "#10b981",
        "truck":       "#f59e0b",
        "motorcycle":  "#8b5cf6",
        "pedestrian":  "#ef4444",
        "bicycle":     "#ec4899",
    }
    return colors.get(cls, "#94a3b8")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
