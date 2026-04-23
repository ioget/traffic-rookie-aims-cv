#!/usr/bin/env python3
"""
Projet de Détection et Suivi du Trafic Routier - AIMS Sénégal
Point d'entrée principal pour le système de vision par ordinateur
"""

import cv2
import argparse
import logging
from pathlib import Path
from src.detection.yolo_detector import YOLODetector
from src.tracking.sort_tracker import SORTTracker
from src.visualization.video_processor import VideoProcessor
from src.data_management.logger import DetectionLogger

def setup_logging():
    """Configure la journalisation"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/detection.log'),
            logging.StreamHandler()
        ]
    )

def parse_args():
    """Parse les arguments de ligne de commande"""
    parser = argparse.ArgumentParser(description="Système de détection et suivi du trafic")
    parser.add_argument("--video", type=str, required=True, help="Chemin vers la vidéo")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Modèle YOLO à utiliser")
    parser.add_argument("--output", type=str, help="Chemin de sortie pour la vidéo traitée")
    parser.add_argument("--confidence", type=float, default=0.5, help="Seuil de confiance")
    parser.add_argument("--tracking", action="store_true", help="Activer le tracking")
    parser.add_argument("--web", action="store_true", help="Lancer l'interface web")
    return parser.parse_args()

def main():
    """Fonction principale"""
    setup_logging()
    args = parse_args()
    
    # Vérifier si la vidéo existe
    if not Path(args.video).exists():
        logging.error(f"Vidéo non trouvée: {args.video}")
        return
    
    # Initialiser le détecteur
    logging.info("Initialisation du détecteur YOLO...")
    detector = YOLODetector(model_path=args.model, confidence_threshold=args.confidence)
    
    # Initialiser le tracker si demandé
    tracker = None
    if args.tracking:
        logging.info("Initialisation du tracker SORT...")
        tracker = SORTTracker()
    
    # Initialiser le processeur vidéo
    processor = VideoProcessor(detector, tracker)
    
    # Initialiser le logger
    logger = DetectionLogger()
    
    # Traiter la vidéo
    logging.info(f"Traitement de la vidéo: {args.video}")
    output_path = args.output if args.output else "output_" + Path(args.video).name
    
    try:
        stats = processor.process_video(
            input_path=args.video,
            output_path=output_path,
            logger=logger
        )
        
        # Afficher les statistiques
        logging.info("Traitement terminé!")
        logging.info(f"Statistiques: {stats}")
        
    except Exception as e:
        logging.error(f"Erreur lors du traitement: {e}")
    
    # Lancer l'interface web si demandé
    if args.web:
        logging.info("Lancement de l'interface web...")
        from web_interface.app import app
        app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    main()