import cv2
import torch
import numpy as np
from ultralytics import YOLO
from typing import List, Tuple, Dict, Any
import logging

class YOLODetector:
    """
    Classe pour la détection d'objets avec YOLOv8
    Adaptée pour le projet de trafic routier sénégalais
    """
    
    def __init__(self, model_path: str = "yolov8n.pt", confidence_threshold: float = 0.5):
        """
        Initialise le détecteur YOLO
        
        Args:
            model_path: Chemin vers le modèle pré-entraîné
            confidence_threshold: Seuil de confiance pour les détections
        """
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.class_names = {
            0: 'person',
            1: 'rider', 
            2: 'car',
            3: 'bus',
            4: 'truck',
            5: 'bike',
            6: 'motor',
            7: 'traffic light',
            8: 'traffic sign',
            9: 'train'
        }
        
        # Classes prioritaires pour le contexte sénégalais
        self.priority_classes = [0, 2, 6, 3, 4]  # person, car, motor, bus, truck
        
        logging.info(f"Modèle YOLO chargé depuis {model_path}")
    
    def detect_objects(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Détecte les objets dans une image
        
        Args:
            image: Image numpy array (BGR format)
            
        Returns:
            Liste des détections avec format standardisé
        """
        results = self.model(image, conf=self.confidence_threshold)
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Coordonnées de la boîte
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    # Filtrer les classes pertinentes
                    if class_id in self.class_names:
                        detection = {
                            'bbox': [int(x1), int(y1), int(x2), int(y2)],
                            'confidence': float(confidence),
                            'class_id': class_id,
                            'class_name': self.class_names[class_id],
                            'center': [int((x1 + x2) / 2), int((y1 + y2) / 2)],
                            'area': int((x2 - x1) * (y2 - y1))
                        }
                        detections.append(detection)
        
        return detections
    
    def filter_by_priority(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filtre les détections par classes prioritaires
        
        Args:
            detections: Liste des détections
            
        Returns:
            Détections filtrées
        """
        return [det for det in detections if det['class_id'] in self.priority_classes]
    
    def get_class_statistics(self, detections: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Calcule les statistiques par classe
        
        Args:
            detections: Liste des détections
            
        Returns:
            Dictionnaire des comptes par classe
        """
        stats = {}
        for det in detections:
            class_name = det['class_name']
            stats[class_name] = stats.get(class_name, 0) + 1
        return stats
    
    def draw_detections(self, image: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """
        Dessine les détections sur l'image
        
        Args:
            image: Image originale
            detections: Liste des détections
            
        Returns:
            Image avec les détections dessinées
        """
        annotated_image = image.copy()
        
        # Couleurs pour différentes classes
        colors = {
            'person': (0, 255, 0),      # Vert
            'car': (255, 0, 0),         # Rouge
            'motor': (0, 0, 255),       # Bleu
            'bus': (255, 255, 0),       # Jaune
            'truck': (255, 0, 255),     # Magenta
            'bike': (0, 255, 255),      # Cyan
            'rider': (128, 0, 128),     # Violet
            'traffic light': (255, 165, 0), # Orange
            'traffic sign': (0, 165, 255),  # Bleu clair
            'train': (128, 128, 128)    # Gris
        }
        
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            class_name = det['class_name']
            confidence = det['confidence']
            
            # Couleur selon la classe
            color = colors.get(class_name, (255, 255, 255))
            
            # Dessiner la boîte
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)
            
            # Étiquette avec confiance
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            # Fond pour l'étiquette
            cv2.rectangle(annotated_image, 
                         (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), 
                         color, -1)
            
            # Texte de l'étiquette
            cv2.putText(annotated_image, label, 
                       (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 
                       0.5, (255, 255, 255), 2)
        
        return annotated_image
    
    def fine_tune_model(self, dataset_config: str, epochs: int = 50):
        """
        Fine-tune le modèle sur le dataset BDD100K
        
        Args:
            dataset_config: Chemin vers le fichier de configuration du dataset
            epochs: Nombre d'époques d'entraînement
        """
        try:
            results = self.model.train(
                data=dataset_config,
                epochs=epochs,
                imgsz=640,
                batch=16,
                name='yolov8n_traffic_senegal',
                save=True,
                plots=True,
                device='cuda' if torch.cuda.is_available() else 'cpu'
            )
            
            logging.info("Fine-tuning terminé avec succès")
            return results
            
        except Exception as e:
            logging.error(f"Erreur lors du fine-tuning: {e}")
            return None
