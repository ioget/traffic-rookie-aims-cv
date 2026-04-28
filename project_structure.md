# Structure du Projet - Détection et Suivi du Trafic Routier

## Organisation des Dossiers

```
object_detection/
├── data/                           # Données du projet
│   ├── raw/                        # Vidéos brutes
│   │   ├── scene1_intersection.mp4
│   │   ├── scene2_roundabout.mp4
│   │   └── scene3_highway.mp4
│   ├── processed/                  # Images extraites et prétraitées
│   │   ├── train/
│   │   │   ├── images/
│   │   │   └── labels/
│   │   ├── val/
│   │   │   ├── images/
│   │   │   └── labels/
│   │   └── test/
│   │       ├── images/
│   │       └── labels/
│   └── annotations/                # Fichiers d'annotation YOLO
├── models/                         # Modèles entraînés
│   ├── yolov8n_traffic.pt          # Modèle fine-tuné
│   ├── yolov8n_traffic.yaml        # Configuration
│   └── pretrained/                  # Poids pré-entraînés
├── src/                            # Code source
│   ├── detection/                  # Module détection
│   │   ├── __init__.py
│   │   ├── yolo_detector.py
│   │   └── detector_utils.py
│   ├── tracking/                   # Module tracking
│   │   ├── __init__.py
│   │   ├── sort_tracker.py
│   │   └── tracker_utils.py
│   ├── visualization/              # Module visualisation
│   │   ├── __init__.py
│   │   ├── video_processor.py
│   │   └── dashboard.py
│   ├── data_management/            # Gestion des données
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   └── statistics.py
│   └── utils/                      # Utilitaires
│       ├── __init__.py
│       ├── config.py
│       └── data_loader.py
├── web_interface/                  # Interface web
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── uploads/
│   ├── templates/
│   │   ├── index.html
│   │   └── results.html
│   ├── app.py                      # Application Flask/FastAPI
│   └── routes.py                   # Routes API
├── logs/                           # Journaux d'exécution
│   ├── detection_logs/
│   ├── tracking_logs/
│   └── statistics/
├── notebooks/                      # Jupyter pour expérimentation
│   ├── data_exploration.ipynb
│   ├── model_training.ipynb
│   └── results_analysis.ipynb
├── tests/                          # Tests unitaires
│   ├── test_detection.py
│   ├── test_tracking.py
│   └── test_visualization.py
├── configs/                        # Fichiers de configuration
│   ├── dataset_config.yaml
│   ├── training_config.yaml
│   └── app_config.yaml
├── requirements.txt                # Dépendances Python
├── setup.py                        # Installation du package
├── README.md                       # Documentation
└── main.py                         # Point d'entrée principal
```

## Classes d'Objets Ciblées

Basées sur votre dataset BDD100K YOLO, nous allons nous concentrer sur:

```yaml
nc: 10
names:
  0: person        # Piétons
  1: rider         # Motards/Cyclistes
  2: car           # Voitures
  3: bus           # Bus
  4: truck         # Camions
  5: bike          # Vélos
  6: motor         # Motos
  7: traffic light # Feux de signalisation
  8: traffic sign  # Panneaux de signalisation
  9: train         # Trains (moins pertinent pour Sénégal)
```

## Workflow de Développement

1. **Phase 1**: Configuration et préparation des données
2. **Phase 2**: Fine-tuning du modèle YOLO sur les classes pertinentes
3. **Phase 3**: Implémentation du système de tracking
4. **Phase 4**: Développement de l'interface web
5. **Phase 5**: Tests et validation
6. **Phase 6**: Documentation et déploiement

## Technologies Recommandées

- **Détection**: YOLOv8/YOLOv11 (Ultralytics)
- **Tracking**: DeepSORT ou ByteTrack
- **Interface Web**: Flask/FastAPI + HTML/CSS/JavaScript
- **Traitement vidéo**: OpenCV
- **Data**: Pandas, NumPy
- **Visualisation**: Matplotlib, Plotly
