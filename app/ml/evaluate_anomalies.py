import numpy as np
import os
import json
from datetime import datetime, timedelta
from app.ml.anomaly_detector import anomaly_detector
from app.ml.lstm_anomaly_detector import lstm_detector
from app.models.medication_log import MedicationLog
from app.extensions import db
from flask import current_app

def generate_roc_pr_data(patient_id, logs):
    """
    Generate ROC and PR curve data points by varying thresholds
    for both Z-score and LSTM models.
    """
    if len(logs) < 20:
        return None
        
    # Split into train (normal) and test (with injected anomalies)
    split_idx = int(len(logs) * 0.7)
    train_logs = logs[:split_idx]
    test_logs = logs[split_idx:]
    
    # Ensure models are trained on baseline
    anomaly_detector.train(patient_id, train_logs)
    lstm_detector.train_for_patient(patient_id, train_logs, epochs=20)
    
    # Inject some fake anomalies into test logs for evaluation
    # (e.g., change timestamps to 3 AM, or mark as 'missed')
    for i in range(0, len(test_logs), 5):
        test_logs[i]['status'] = 'missed' # Injected anomaly
        test_logs[i]['taken_at'] = (datetime.fromisoformat(test_logs[i]['scheduled_time'].replace('Z', '+00:00')) + timedelta(hours=6)).isoformat()

    # Ground truth labels
    labels = [1 if i % 5 == 0 else 0 for i in range(len(test_logs))]
    
    # Get scores
    z_scores = []
    lstm_scores = []
    
    for i in range(len(test_logs)):
        window = test_logs[max(0, i-6):i+1]
        z_res = anomaly_detector.detect(patient_id, window)
        l_res = lstm_detector.predict(patient_id, window)
        
        z_scores.append(z_res.anomaly_score)
        lstm_scores.append(l_res['score'])
        
    # Generate curve points (ROC)
    roc_points = []
    for threshold in np.linspace(0, 5, 20): # For Z-score
        tpr = sum(1 for s, l in zip(z_scores, labels) if s > threshold and l == 1) / (sum(labels) or 1)
        fpr = sum(1 for s, l in zip(z_scores, labels) if s > threshold and l == 0) / (len(labels) - sum(labels) or 1)
        
        # For LSTM (normalized thresholds)
        l_threshold = threshold / 50.0 
        l_tpr = sum(1 for s, l in zip(lstm_scores, labels) if s > l_threshold and l == 1) / (sum(labels) or 1)
        l_fpr = sum(1 for s, l in zip(lstm_scores, labels) if s > l_threshold and l == 0) / (len(labels) - sum(labels) or 1)
        
        roc_points.append({
            'x': round(fpr, 2),
            'zscore': round(tpr, 2),
            'lstm': round(l_tpr, 2)
        })
        
    return {
        'rocData': sorted(roc_points, key=lambda x: x['x']),
        'currentScore': {
            'lstm': lstm_detector.predict(patient_id, test_logs[-7:]),
            'zscore': anomaly_detector.detect(patient_id, test_logs[-7:]).to_dict()
        }
    }
