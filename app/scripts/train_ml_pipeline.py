import pandas as pd
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

def train_production_model(dataset_path, model_output_path):
    print(f"📦 Loading dataset: {dataset_path}")
    if not os.path.exists(dataset_path):
        print("❌ Dataset not found. Please run scripts/generate_research_data.py first.")
        return

    df = pd.read_csv(dataset_path)
    
    # Feature Selection mirroring PredictionService
    priority_map = {'high': 2, 'normal': 1, 'low': 0}
    df['priority_encoded'] = df['priority'].map(priority_map)
    
    X = df[['hour', 'day_of_week', 'is_weekend', 'priority_encoded']]
    y = df['adherence_target']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    
    print("🧠 Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"✅ Training Complete. Validation Accuracy: {score:.4f}")
    
    # Save Model
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    with open(model_output_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"🚀 Model serialized to: {model_output_path}")

if __name__ == "__main__":
    dataset = 'research/datasets/adherence_dataset.csv'
    model_path = 'app/services/models/adherence_model.pkl'
    train_production_model(dataset, model_path)
