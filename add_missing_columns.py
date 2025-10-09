#!/usr/bin/env python3
"""
Script to add missing columns to the database schema
"""
import sqlite3
import os
from datetime import datetime

def add_missing_columns():
    db_path = os.path.join('instance', 'medguardian.db')
    
    if not os.path.exists(db_path):
        print("Database not found. Please run the application first to create the database.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns exist
        cursor.execute("PRAGMA table_info(medication)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add start_date if not exists
        if 'start_date' not in columns:
            cursor.execute("ALTER TABLE medication ADD COLUMN start_date DATE")
            print("Added start_date column")
        
        # Add end_date if not exists
        if 'end_date' not in columns:
            cursor.execute("ALTER TABLE medication ADD COLUMN end_date DATE")
            print("Added end_date column")
        
        # Add priority if not exists
        if 'priority' not in columns:
            cursor.execute("ALTER TABLE medication ADD COLUMN priority VARCHAR(20) DEFAULT 'normal'")
            print("Added priority column")
        
        # Add custom_times if not exists
        if 'custom_times' not in columns:
            cursor.execute("ALTER TABLE medication ADD COLUMN custom_times VARCHAR(200)")
            print("Added custom_times column")
        
        conn.commit()
        print("Database schema updated successfully!")
        
    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_missing_columns()
