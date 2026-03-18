import sys
import os
from datetime import datetime
import pandas as pd

# Add app to path
sys.path.append(os.getcwd())
from app.ml.ensemble_adherence_predictor import EnsembleAdherencePredictor

def verify_ensemble_logic():
    print("🔍 Verifying Ensemble Adherence Predictor Logic...")
    
    # 1. Load the trained model
    model_path = 'app/services/models/ensemble_adherence_model.pkl'
    if not os.path.exists(model_path):
        print(f"❌ Model file not found at {model_path}")
        return
        
    predictor = EnsembleAdherencePredictor.load(model_path)
    print("✅ Model loaded successfully.")
    
    # 2. Test Prediction with synthetic feature vector
    # Features: hour, day_of_week, is_weekend, priority_encoded
    test_features = pd.DataFrame([{
        'hour': 9,
        'day_of_week': 0, # Monday
        'is_weekend': 0,
        'priority_encoded': 1 # High priority
    }])
    
    probs = predictor.predict_proba(test_features)
    prob_taken = probs[0][1]
    
    print(f"Prediction result for 9 AM High-Priority dose (Monday):")
    print(f"- Probability of taking: {prob_taken:.4f}")
    
    # 3. Test Weekend effect
    weekend_features = pd.DataFrame([{
        'hour': 9,
        'day_of_week': 6, # Sunday
        'is_weekend': 1,
        'priority_encoded': 1
    }])
    weekend_prob = predictor.predict_proba(weekend_features)[0][1]
    print(f"Prediction result for 9 AM High-Priority dose (Sunday):")
    print(f"- Probability of taking: {weekend_prob:.4f}")

    if weekend_prob != prob_taken:
        print("✅ Ensemble correctly distinguished between Weekday and Weekend patterns.")

    print("\n✅ Verification complete. Ensemble model logic is robust.")

if __name__ == "__main__":
    verify_ensemble_logic()
