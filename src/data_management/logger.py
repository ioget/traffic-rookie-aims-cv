import json
import logging
from datetime import datetime
from pathlib import Path


class DetectionLogger:
    """
    Logs per-frame detections to a JSON file following the common data schema.
    Schema fields: timestamp, frame_id, video_source, class_name, class_id,
                   track_id, bbox, confidence.
    """

    def __init__(self, output_dir: str = "logs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.records: list[dict] = []
        self.log_path: Path | None = None

    def start(self, video_path: str):
        video_name = Path(video_path).stem
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_path = self.output_dir / f"{video_name}_{timestamp}.json"
        self.records = []
        logging.info(f"Logging detections to {self.log_path}")

    def log_frame(self, frame_id: int, detections: list[dict], video_source: str = ""):
        timestamp = datetime.now().isoformat()
        for det in detections:
            self.records.append({
                "timestamp":    timestamp,
                "frame_id":     frame_id,
                "video_source": video_source,
                "class_name":   det.get("class_name"),
                "class_id":     det.get("class_id"),
                "track_id":     det.get("track_id"),
                "bbox":         det.get("bbox"),
                "confidence":   det.get("confidence"),
            })

    def save(self, stats: dict | None = None):
        if self.log_path is None:
            return
        output = {"detections": self.records}
        if stats:
            output["stats"] = stats
        with open(self.log_path, "w") as f:
            json.dump(output, f, indent=2)
        logging.info(f"Saved {len(self.records)} records to {self.log_path}")
