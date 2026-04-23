
import cv2 as cv
from matplotlib import pyplot as plt

class Classifier():
    def __init__(self, filepath):
        self.filepath = filepath
        self.model_path = "models/stop_data.xml"

    def forward(self):
        img = cv.imread(self.filepath)
        print(img is None)
        self.img_rgb = cv.cvtColor(img, cv.COLOR_BGR2RGB)
        img_gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
        self.img_detected = self.img_rgb.copy()
        model = cv.CascadeClassifier(self.model_path) # load model
        found = model.detectMultiScale(img_gray, minSize=(20, 20))
        return found

    def plot(self):
        found = self.forward()
        for (x, y, w, h) in found:
            cv.rectangle(self.img_detected, (x, y), (x+w, y+h), (0, 255, 0), 4)
        fig, axes = plt.subplots(1, 2, figsize=(20, 10))
        axes[0].imshow(self.img_rgb)
        axes[1].imshow(self.img_detected)
        axes[0].set_title('original')
        axes[1].set_title('detected')
        axes[0].axis('off')
        axes[1].axis('off')
        plt.tight_layout()
        plt.show()

