# MedGuardian — ML Models

## Trained by us (custom)
| Model | File | Size | Purpose |
|-------|------|------|---------|
| LSTM Autoencoder | app/ml/models/lstm_anomaly_model.pth | 264KB | Anomaly detection |
| SHAP + GBM | app/ml/models/shap_model.pkl | 130KB | Explainability |
| GNN | app/models/saved/gnn_interaction_model.pt | 85KB | Drug interactions |

## Pre-trained weights used
| Model | File | Size | Purpose |
|-------|------|------|---------|
| YOLO-World | yolov8s-worldv2.pt | 24.7MB | Hand + bottle detection |
| ResNet50 Siamese | app/services/models/pill_metric_model.pth | 94MB | Visual pill matching |
| Ensemble Adherence | app/services/models/ensemble_adherence_model.pkl | 9.4MB | Adherence prediction |
| Llama 3.2-1B | backend/models/saved/llama-medguardian/ | 2.3GB | Local LLM (RAG) |
| BioBERT | HuggingFace cache | ~400MB | Prescription NER |

## Key numbers
- LSTM threshold: 0.0959 (95th percentile reconstruction error)
- SHAP accuracy: 96.4% on 500 samples
- GNN: 18 drugs, 25 interaction pairs, final loss 0.1484
- Siamese similarity threshold: 0.82
- YOLO confidence threshold: 0.35 (hand detection), 0.60 (medicine detection)

## Training commands
- LSTM: `$env:PYTHONPATH="."; python scripts/train_lstm.py`
- SHAP: `$env:PYTHONPATH="."; python scripts/train_shap.py`
- GNN: `$env:PYTHONPATH="."; python scripts/train_gnn.py`
