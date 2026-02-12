import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def generate_dataset(output_path, num_rows=10000):
    np.random.seed(42)
    
    data = []
    base_date = datetime(2025, 1, 1)
    
    # Medication Profiles
    # Type: (Priority, Baseline Adherence)
    med_profiles = {
        'Metformin': ('high', 0.92),
        'Lisinopril': ('high', 0.88),
        'Atorvastatin': ('normal', 0.85),
        'Multivitamin': ('low', 0.70),
        'Donepezil': ('high', 0.95), # Alzheimer's med - usually high adherence due to caregiver
        'Advil': ('low', 0.60)
    }
    
    medicines = list(med_profiles.keys())
    
    for i in range(num_rows):
        # Generate temporal features
        days_offset = np.random.randint(0, 365)
        hour = np.random.randint(0, 24)
        minute = np.random.randint(0, 60)
        
        timestamp = base_date + timedelta(days=days_offset, hours=hour, minutes=minute)
        day_of_week = timestamp.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Select medication
        med_name = np.random.choice(medicines)
        priority, baseline = med_profiles[med_name]
        
        # Behavioral logic for "target" (Taken correctly or not)
        # 1. Weekend lapse (lower adherence on weekends)
        adherence = baseline
        if is_weekend:
            adherence -= 0.15
            
        # 2. Night-time confusion (lower adherence late at night)
        if hour >= 22 or hour <= 5:
            adherence -= 0.20
            
        # 3. Priority boost
        if priority == 'high':
            adherence += 0.05
            
        # 4. Randomized noise
        adherence = np.clip(adherence + np.random.normal(0, 0.05), 0, 1)
        
        target = 1 if np.random.random() < adherence else 0
        
        # Latency (how late the dose was taken if target=1)
        latency = 0
        if target == 1:
            latency = np.random.exponential(15) # mean 15 mins late
            
        data.append({
            'timestamp': timestamp.isoformat(),
            'medication': med_name,
            'priority': priority,
            'hour': hour,
            'day_of_week': day_of_week,
            'is_weekend': is_weekend,
            'latency_mins': round(latency, 2),
            'user_id': np.random.randint(1, 20), # Simulate multiple users
            'adherence_target': target
        })
        
    df = pd.DataFrame(data)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"✅ Generated {num_rows} rows at {output_path}")

if __name__ == "__main__":
    generate_dataset('research/datasets/adherence_dataset.csv')
