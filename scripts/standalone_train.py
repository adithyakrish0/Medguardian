import os
import pickle
import pandas as pd
from sqlalchemy import create_engine, text
from sklearn.ensemble import RandomForestClassifier
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def standalone_train():
    db_url = os.getenv('DATABASE_URL')
    if not db_url: return
    if db_url.startswith('postgres://'): db_url = db_url.replace('postgres://', 'postgresql://', 1)
    
    engine = create_engine(db_url)
    with engine.connect() as conn:
        query = text("""
            SELECT taken_at, scheduled_time, taken_correctly, status, medication_id
            FROM medication_log WHERE user_id = 1
        """)
        df = pd.read_sql(query, conn)
    
    if len(df) < 20: 
        print(f"Still insufficient data ({len(df)})")
        return

    # Prepare features (same as in PredictionService)
    df['scheduled_time'] = pd.to_datetime(df['scheduled_time'])
    df['hour'] = df['scheduled_time'].dt.hour
    df['day_of_week'] = df['scheduled_time'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    X = df[['hour', 'day_of_week', 'is_weekend', 'medication_id']]
    y = df['taken_correctly'].astype(int)
    
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    model_dir = 'app/services/models'
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, 'adherence_model.pkl')
    
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"✅ Standalone Training Complete. Model saved to {model_path}")

if __name__ == "__main__":
    standalone_train()
