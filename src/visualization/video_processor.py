import cv2
import logging
from pathlib import Path

COLORS = {
    "person":       (0, 255, 0),
    "rider":        (128, 0, 128),
    "car":          (255, 0, 0),
    "bus":          (255, 255, 0),
    "truck":        (255, 0, 255),
    "bike":         (0, 255, 255),
    "motor":        (0, 0, 255),
    "traffic light":(255, 165, 0),
    "traffic sign": (0, 165, 255),
    "train":        (128, 128, 128),
}


class VideoProcessor:
    """
    Processes a video file frame by frame.
    Uses model.track() so detection and tracking happen in one call.
    """

    def __init__(self, detector, tracker):
        self.detector = detector
        self.tracker = tracker

    def process_video(self, input_path: str, output_path: str, logger=None) -> dict:
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {input_path}")

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        writer = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

        if logger:
            logger.start(input_path)

        frame_id = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        logging.info(f"Processing {total_frames} frames...")

        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break

            # Detection + tracking in one call
            results = self.detector.model.track(
                frame,
                conf=self.detector.confidence_threshold,
                persist=True,
                verbose=False,
            )[0]

            detections = []
            if self.tracker:
                detections = self.tracker.update(results, self.detector.class_names)
            else:
                detections = self.detector.detect_objects(frame)

            if logger:
                logger.log_frame(frame_id, detections, video_source=input_path)

            annotated = self._draw(frame, detections, frame_id)
            writer.write(annotated)
            frame_id += 1

        cap.release()
        writer.release()

        stats = {}
        if self.tracker:
            stats["unique_counts"] = self.tracker.get_unique_counts()
            stats["total_frames"] = frame_id

        if logger:
            logger.save(stats)

        logging.info(f"Output saved to {output_path}")
        return stats

    def _draw(self, frame, detections: list[dict], frame_id: int):
        out = frame.copy()

        if not detections:
            cv2.putText(out, "No objects detected", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            return out

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cls = det["class_name"]
            tid = det["track_id"]
            conf = det["confidence"]
            color = COLORS.get(cls, (255, 255, 255))

            cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
            label = f"{cls} #{tid} {conf:.2f}"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(out, (x1, y1 - lh - 6), (x1 + lw, y1), color, -1)
            cv2.putText(out, label, (x1, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        cv2.putText(out, f"Frame: {frame_id}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        return out
