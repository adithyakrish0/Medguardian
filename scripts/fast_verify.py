import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def fast_count():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in .env")
        return
    
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
        
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT count(*) FROM medication_log WHERE user_id = 1"))
        count = result.scalar()
        print(f"Total Logs for User 1: {count}")
        
    model_path = 'app/services/models/adherence_model.pkl'
    print(f"Model exists: {os.path.exists(model_path)}")

if __name__ == "__main__":
    fast_count()
