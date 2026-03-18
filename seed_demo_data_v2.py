"""
Seeding script v2 - Directly populates testsenior and testcaregiver with realistic data.
Bypasses Flask app initialization to avoid heavy model loading.
"""
import os
import sys
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
load_dotenv(override=True)

from sqlalchemy import create_engine, text
from werkzeug.security import generate_password_hash

DB_URL = os.getenv('DATABASE_URL')
if not DB_URL:
    print("❌ DATABASE_URL not set in .env"); sys.exit(1)

engine = create_engine(DB_URL)

def get_user_id(conn, username):
    res = conn.execute(text("SELECT id FROM \"user\" WHERE username = :u"), {"u": username}).fetchone()
    return res[0] if res else None

def seed():
    with engine.connect() as conn:
        print("--- Starting Data Seeding ---")
        
        senior_id = get_user_id(conn, 'testsenior')
        caregiver_id = get_user_id(conn, 'testcaregiver')
        
        if not senior_id or not caregiver_id:
            print("❌ Test users not found. Run init_db_lite.py first.")
            return

        # 1. Link Caregiver to Senior
        conn.execute(text("""
            INSERT INTO caregiver_senior (caregiver_id, senior_id, relationship_type, status, added_at)
            SELECT :c, :s, 'Primary Caregiver', 'accepted', NOW()
            WHERE NOT EXISTS (SELECT 1 FROM caregiver_senior WHERE caregiver_id = :c AND senior_id = :s)
        """), {"c": caregiver_id, "s": senior_id})
        print("✅ Caregiver-Senior relationship established.")

        # 2. Add Medications
        meds = [
            {
                "name": "Metformin", "dosage": "500mg", "frequency": "Twice daily", 
                "instructions": "Take with meals to reduce stomach upset.",
                "morning": True, "evening": True, "priority": "high", "ai_trained": True,
                "quantity_remaining": 45, "initial_quantity": 60
            },
            {
                "name": "Lisinopril", "dosage": "10:mg", "frequency": "Once daily", 
                "instructions": "Take in the morning for blood pressure.",
                "morning": True, "priority": "high", "ai_trained": True,
                "quantity_remaining": 12, "initial_quantity": 30
            },
            {
                "name": "Atorvastatin", "dosage": "40mg", "frequency": "Once daily at night", 
                "instructions": "Cholesterol management.",
                "night": True, "priority": "normal", "ai_trained": False,
                "quantity_remaining": 20, "initial_quantity": 30
            },
            {
                "name": "Multivitamin", "dosage": "1 tablet", "frequency": "Once daily", 
                "instructions": "General health supplement.",
                "morning": True, "priority": "low", "ai_trained": False,
                "quantity_remaining": 88, "initial_quantity": 100
            }
        ]

        for m in meds:
            # Check if med exists
            existing = conn.execute(text("SELECT id FROM medication WHERE user_id = :u AND name = :n"), 
                                  {"u": senior_id, "n": m["name"]}).fetchone()
            if not existing:
                res = conn.execute(text("""
                    INSERT INTO medication (
                        name, dosage, frequency, instructions, user_id, 
                        morning, afternoon, evening, night, priority, ai_trained,
                        quantity_remaining, initial_quantity, created_at, updated_at
                    ) VALUES (
                        :n, :d, :f, :i, :u, 
                        :m, :a, :e, :ni, :p, :at,
                        :qr, :iq, NOW(), NOW()
                    ) RETURNING id
                """), {
                    "n": m["name"], "d": m["dosage"], "f": m["frequency"], "i": m.get("instructions", ""), 
                    "u": senior_id, "m": m.get("morning", False), "a": m.get("afternoon", False), 
                    "e": m.get("evening", False), "ni": m.get("night", False), "p": m["priority"],
                    "at": m["ai_trained"], "qr": m.get("quantity_remaining"), "iq": m.get("initial_quantity")
                })
                med_id = res.fetchone()[0]
                print(f" + Added medication: {m['name']}")
                
                # 3. Add Logs for this medication (last 3 days)
                for day_offset in range(3):
                    log_date = datetime.utcnow() - timedelta(days=day_offset)
                    # If trained, simulate some successful logs
                    if m["ai_trained"]:
                        status = "verified"
                        method = "auto"
                        conf = 0.98 if day_offset == 0 else 0.95
                    else:
                        status = "verified"
                        method = "manual"
                        conf = None

                    conn.execute(text("""
                        INSERT INTO medication_log (
                            medication_id, user_id, taken_at, scheduled_time, 
                            status, verified_by_camera, verification_confidence, verification_method, created_at
                        ) VALUES (
                            :mid, :uid, :ta, :st, :s, :vbc, :vc, :vm, NOW()
                        )
                    """), {
                        "mid": med_id, "uid": senior_id, 
                        "ta": log_date, "st": log_date, 
                        "s": status, "vbc": m["ai_trained"], 
                        "vc": conf, "vm": method
                    })
            else:
                print(f" - Medication {m['name']} already exists.")

        conn.commit()
        print("\n✅ Demo data seeded successfully for 'testsenior' and 'testcaregiver'.")

if __name__ == "__main__":
    seed()
