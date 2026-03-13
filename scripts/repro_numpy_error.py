import sys
import os
import pandas as pd
import numpy as np
import pickle

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from app.ml.explainer import get_explainer

def test_repro():
    print("Initializing explainer...")
    explainer = get_explainer()
    
    # Ensure model is "loaded" or mock it
    if not explainer.model:
        print("Model not found at expected path. Attempting to train/save a dummy model.")
        from sklearn.ensemble import RandomForestClassifier
        X = pd.DataFrame(np.random.rand(10, 4), columns=['hour', 'day_of_week', 'is_weekend', 'priority_encoded'])
        y = np.random.randint(0, 2, 10)
        model = RandomForestClassifier()
        model.fit(X, y)
        explainer.model = model
        explainer._init_explainer()

    features = {
        'hour': 9,
        'day_of_week': 1,
        'is_weekend': 0,
        'priority': 1
    }
    
    print("Attempting to explain prediction...")
    try:
        explanation = explainer.explain_prediction(features, generate_plot=True)
        print("Success!")
    except Exception as e:
        import traceback
        print(f"Error type: {type(e)}")
        print(f"Error message: {e}")
        traceback.print_exc()
        # Debugging types
        try:
            X = pd.DataFrame([features])
            sv = explainer.explainer.shap_values(X)
            print(f"DEBUG: type(shap_values) = {type(sv)}")
            if isinstance(sv, list):
                print(f"DEBUG: len(shap_values) = {len(sv)}")
                print(f"DEBUG: type(shap_values[0]) = {type(sv[0])}")
            elif hasattr(sv, 'shape'):
                 print(f"DEBUG: shap_values.shape = {sv.shape}")
        except:
            pass

if __name__ == "__main__":
    test_repro()
