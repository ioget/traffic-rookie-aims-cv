# Object detection

```
conda activate aims_cv
pip install ultralytics
```


This repository provides a minimal command‑line tool for running object detection on an input image or video using different model backends. The script supports a classical Cascade Classifier and YOLO.

```
python main.py --model cascade --filepath data/stop.jpg
```

```
python main.py --model yolov11 --filepath data/traffic-sign-test.mp4
```

```
python main.py --model yolov11 --filepath data/traffic.mp4
```

The `--model` argument currently accepts `cascade`, `yolov8`, and `yolov11`, and should be extended to include `yolov26` and `ssd`.

## New models


Add the following models to the code:
- Watershed and Otshu's on the stop sign image
- SSD on the traffic video
---
