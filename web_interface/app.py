import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import cv2
import json
import time
import uuid
import threading
import queue
import logging
import numpy as np
from collections import defaultdict, deque
from datetime import datetime

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from src.detection.yolo_detector import YOLODetector
from src.tracking.sort_tracker import SORTTracker

# ── Config ───────────────────────────────────────────────────────────────────
MODEL_PATH   = "models/yolo11n_finetuned.pt"
DEFAULT_VIDEO = "data/fecc9a75-f0ac-49bc-8e48-02e71bef2cd7-0.mp4"
UPLOAD_DIR   = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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

COLORS = {
    "pedestrian":    (0,   255,  0),
    "car":           (255,  0,   0),
    "bus":           (255, 255,  0),
    "truck":         (255,  0,  255),
    "bicycle":       (0,   255, 255),
    "motorcycle":    (0,    0,  255),
    "traffic light": (255, 165,  0),
    "traffic sign":  (0,  165,  255),
    "train":         (128, 128, 128),
}

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# ── Shared state ──────────────────────────────────────────────────────────────
state = {
    "running":       False,
    "video_path":    DEFAULT_VIDEO,
    "frame_id":      0,
    "total_frames":  0,
    "total":         0,
    "unique_ids":    set(),
    "class_counts":  defaultdict(int),
    "logs":          deque(maxlen=200),
    "hourly":        defaultdict(int),
    "latency_ms":    0.0,
    "frame_bytes":   None,   # latest annotated JPEG bytes for MJPEG stream
}
event_queue: queue.Queue = queue.Queue(maxsize=50)
state_lock   = threading.Lock()
frame_lock   = threading.Lock()


# ── Draw annotations on frame ─────────────────────────────────────────────────
def _annotate(frame: np.ndarray, detections: list, frame_id: int) -> np.ndarray:
    out = frame.copy()

    if not detections:
        cv2.putText(out, "No objects detected", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        return out

    for det in detections:
        x1, y1, x2, y2  = det["bbox"]
        cls   = det["frontend_cls"]
        tid   = det["track_id"]
        conf  = det["confidence"]
        color = COLORS.get(cls, (255, 255, 255))

        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        label = f"{cls} #{tid} {conf:.0%}"
        (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(out, (x1, y1 - lh - 6), (x1 + lw + 2, y1), color, -1)
        cv2.putText(out, label, (x1 + 1, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    cv2.putText(out, f"Frame {frame_id}", (10, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
    return out


# ── Detection loop (runs in background thread) ────────────────────────────────
def detection_loop(video_path: str):
    detector = YOLODetector(model_path=MODEL_PATH, confidence_threshold=0.45)
    tracker  = SORTTracker()

    while state["running"]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logging.error(f"Cannot open video: {video_path}")
            break

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        with state_lock:
            state["frame_id"]     = 0
            state["total_frames"] = total_frames

        while state["running"]:
            t0 = time.time()
            ok, frame = cap.read()
            if not ok:
                break  # end of video → loop

            results = detector.model.track(
                frame, conf=detector.confidence_threshold,
                persist=True, verbose=False,
            )[0]

            detections = tracker.update(results, detector.class_names)
            latency = round((time.time() - t0) * 1000, 1)
            hour_key = datetime.now().strftime("%H:00")
            objects  = []
            rich_dets = []

            with state_lock:
                state["frame_id"]   += 1
                state["latency_ms"]  = latency
                fid = state["frame_id"]

                if detections:
                    state["hourly"][hour_key] += len(detections)
                    state["total"]            += len(detections)

                for det in detections:
                    raw_cls = det["class_name"]
                    fcls    = CLASS_MAP.get(raw_cls, raw_cls)
                    tid     = det["track_id"]
                    conf    = det["confidence"]
                    x1, y1, x2, y2 = det["bbox"]
                    h, w = frame.shape[:2]

                    state["unique_ids"].add(f"{fcls}-{tid}")
                    state["class_counts"][fcls] += 1

                    obj = {
                        "id":        f"TRK-{tid:04d}",
                        "class":     fcls,
                        "confidence": round(conf, 4),
                        "bbox":      [round(x1/w,3), round(y1/h,3),
                                      round((x2-x1)/w,3), round((y2-y1)/h,3)],
                        "timestamp": int(time.time() * 1000),
                    }
                    objects.append(obj)
                    state["logs"].appendleft({**obj, "frame_id": fid})
                    rich_dets.append({**det, "frontend_cls": fcls})

            # Draw and encode JPEG
            annotated = _annotate(frame, rich_dets, fid)
            _, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            with frame_lock:
                state["frame_bytes"] = jpeg.tobytes()

            # Push SSE event
            payload = json.dumps({"objects": objects, "frame_id": fid})
            try:
                event_queue.put_nowait(payload)
            except queue.Full:
                pass

        cap.release()
        # loop the video automatically

    with state_lock:
        state["running"] = False
    logging.info("Detection loop stopped.")


# ── API routes ────────────────────────────────────────────────────────────────

@app.post("/api/upload")
def upload_video():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    ext = Path(f.filename).suffix.lower()
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
        video = state.get("video_path") or DEFAULT_VIDEO
        state["running"] = True

    t = threading.Thread(target=detection_loop, args=(video,), daemon=True)
    t.start()
    return jsonify({"message": "Detection started"})


@app.post("/api/detect/stop")
def stop_detection():
    with state_lock:
        state["running"] = False
    return jsonify({"message": "Detection stopped"})


@app.get("/api/video_stream")
def video_stream():
    """MJPEG stream — use as <img src='/api/video_stream'> in the browser."""
    def generate():
        while True:
            with frame_lock:
                jpeg = state["frame_bytes"]
            if jpeg:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n")
            else:
                time.sleep(0.05)

    return Response(
        stream_with_context(generate()),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/stream")
def sse_stream():
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
        processed = state["frame_id"]
        total_f   = state["total_frames"] or 1
        pct       = min(round(processed / total_f * 100), 100)
        return jsonify({
            "live_count":   len([l for l in list(state["logs"])[:5]
                                 if l["frame_id"] == processed]),
            "unique_count": len(state["unique_ids"]),
            "total":        state["total"],
            "latency_ms":   state["latency_ms"],
            "running":      state["running"],
            "class_counts": dict(state["class_counts"]),
            "frames_done":  processed,
            "total_frames": state["total_frames"],
            "progress_pct": pct,
        })


@app.get("/api/logs")
def get_logs():
    limit = int(request.args.get("limit", 100))
    with state_lock:
        return jsonify(list(state["logs"])[:limit])


@app.get("/api/analytics")
def get_analytics():
    with state_lock:
        hourly       = dict(state["hourly"])
        class_counts = dict(state["class_counts"])
    total = sum(class_counts.values()) or 1
    distribution = [
        {"name": cls.capitalize(), "value": round(cnt / total * 100), "color": _color(cls)}
        for cls, cnt in sorted(class_counts.items(), key=lambda x: -x[1])
    ]
    density = [{"time": h, "count": c} for h, c in sorted(hourly.items())]
    return jsonify({"density": density, "distribution": distribution})


def _color(cls):
    return {
        "car":          "#3b82f6",
        "bus":          "#10b981",
        "truck":        "#f59e0b",
        "motorcycle":   "#8b5cf6",
        "pedestrian":   "#ef4444",
        "bicycle":      "#ec4899",
    }.get(cls, "#94a3b8")


# ── Auto-start detection on server launch ─────────────────────────────────────
def _autostart():
    time.sleep(1.5)
    with state_lock:
        state["running"] = True
    detection_loop(DEFAULT_VIDEO)

threading.Thread(target=_autostart, daemon=True).start()


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000, threaded=True)
