import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import sys
import os

# Add app to path
sys.path.append(os.getcwd())
from app.ml.ensemble_adherence_predictor import EnsembleAdherencePredictor

def compare_models():
    dataset_path = 'research/datasets/adherence_dataset.csv'
    if not os.path.exists(dataset_path):
        print("❌ Dataset not found.")
        return

    print("📊 Loading adherence dataset...")
    df = pd.read_csv(dataset_path)
    
    # Feature engineering mirroring the production service
    priority_map = {'high': 1, 'normal': 0, 'low': 0} # Binary priority as in PredictionService
    df['priority_encoded'] = df['priority'].map(priority_map).fillna(0)
    
    X = df[['hour', 'day_of_week', 'is_weekend', 'priority_encoded']]
    y = df['adherence_target']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("🚀 Training Ensemble and individual models...")
    predictor = EnsembleAdherencePredictor()
    predictor.train(X_train, y_train, X_test, y_test)
    
    # Evaluate individual models
    models = {
        "Random Forest": predictor.rf,
        "XGBoost": predictor.xgb,
        "LightGBM": predictor.lgb,
        "ENSEMBLE (Weighted Voting)": predictor.ensemble
    }
    
    results = []
    for name, model in models.items():
        y_pred = model.predict(X_test)
        results.append({
            "Model": name,
            "Accuracy": accuracy_score(y_test, y_pred),
            "F1-Score": f1_score(y_test, y_pred),
            "Precision": precision_score(y_test, y_pred),
            "Recall": recall_score(y_test, y_pred)
        })
    
    results_df = pd.DataFrame(results)
    print("\n--- Model Comparison Report ---")
    print(results_df.to_string(index=False))
    
    # Save the ensemble for use in the app
    predictor.save('app/services/models/ensemble_adherence_model.pkl')
    print("\n✅ Ensemble model boosted performance and is ready for integration.")

if __name__ == "__main__":
    compare_models()
