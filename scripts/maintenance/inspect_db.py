import sqlite3
import os

db_path = os.path.join('instance', 'medguardian.db')
print(f"Checking database at: {os.path.abspath(db_path)}")

if not os.path.exists(db_path):
    print("Database file not found!")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables found:")
        found = False
        for table in tables:
            print(f"- {table[0]}")
            if table[0] == 'caregiver_senior':
                found = True
        
        if found:
            print("\nSUCCESS: 'caregiver_senior' table exists.")
        else:
            print("\nFAILURE: 'caregiver_senior' table does NOT exist.")
            
        conn.close()
    except Exception as e:
        print(f"Error reading database: {e}")
