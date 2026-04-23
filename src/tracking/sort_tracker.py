import numpy as np
from collections import defaultdict


class SORTTracker:
    """
    Thin wrapper around Ultralytics built-in ByteTrack.
    Keeps a count of unique object IDs seen across the whole video.
    """

    def __init__(self):
        self.unique_ids: dict[str, set] = defaultdict(set)

    def update(self, tracked_results, class_names: dict) -> list[dict]:
        """
        Convert ultralytics track results into a standardised list of dicts.

        Args:
            tracked_results: result object from model.track() for one frame
            class_names: {class_id: class_name} mapping

        Returns:
            List of dicts with bbox, track_id, class_id, class_name, confidence
        """
        detections = []

        if tracked_results is None:
            return detections

        boxes = tracked_results.boxes
        if boxes is None or boxes.id is None:
            return detections

        for box in boxes:
            track_id = int(box.id[0])
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            class_name = class_names.get(class_id, str(class_id))

            self.unique_ids[class_name].add(track_id)

            detections.append({
                "track_id":   track_id,
                "class_id":   class_id,
                "class_name": class_name,
                "confidence": round(confidence, 4),
                "bbox":       [x1, y1, x2, y2],
                "center":     [(x1 + x2) // 2, (y1 + y2) // 2],
            })

        return detections

    def get_unique_counts(self) -> dict[str, int]:
        """Return total unique objects seen per class across the whole video."""
        return {cls: len(ids) for cls, ids in self.unique_ids.items()}
