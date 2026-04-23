import cv2 as cv
from ultralytics import solutions

class Detector():
    def __init__(self, filepath):
        self.filepath = filepath
        self.model_path = "models/yolo11n.pt"

    def forward(self):
        cap = cv.VideoCapture(self.filepath)
        assert cap.isOpened(), "issue reading the video"
        region_points = [(20, 500), (1100, 500), (1100, 220), (20, 220)]
        # record object detected live
        w, h, fps = (int(cap.get(x)) for x in (cv.CAP_PROP_FRAME_WIDTH, cv.CAP_PROP_FRAME_HEIGHT, cv.CAP_PROP_FPS))
        video_writer = cv.VideoWriter("recorded_detection.avi", cv.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

        counter = solutions.ObjectCounter(show=True, region=region_points, model=self.model_path)

        while cap.isOpened():
            success, im0 = cap.read()
            if not success:
                print("issue reading the video")
                break
            results = counter(im0)
            video_writer.write(results.plot_im)
        cap.release()
        video_writer.release()
        cv.destroyAllWindows()

