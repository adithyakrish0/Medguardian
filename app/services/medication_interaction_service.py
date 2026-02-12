"""Medication Interaction Service - Clinical safety layer for drug-drug interactions"""
from typing import List, Dict, Optional

class MedicationInteractionService:
    # A curated list of clinically significant drug-drug interactions
    # In a production app, this would query a professional medical API (e.g., RxNav)
    INTERACTION_DATABASE = {
        "warfarin": {
            "aspirin": {"severity": "High", "message": "Increased bleeding risk. Concurrent use requires strict INR monitoring."},
            "ibuprofen": {"severity": "High", "message": "NSAIDs significantly increase hemorrhage risk with anticoagulants."},
            "simvastatin": {"severity": "Moderate", "message": "May increase Warfarin effect; monitor prothrombin time."}
        },
        "lisinopril": {
            "spironolactone": {"severity": "Moderate", "message": "Risk of hyperkalemia (high potassium). Monitor electrolytes."},
            "potassium": {"severity": "High", "message": "Severe risk of hyperkalemia. Avoid potassium supplements unless directed."}
        },
        "sildenafil": {
            "nitroglycerin": {"severity": "Critical", "message": "Fatal hypotension risk. Nitrate use is a strict contraindication."},
            "isosorbide": {"severity": "Critical", "message": "Severe blood pressure drop risk when combined with nitrates."}
        },
        "simvastatin": {
            "amlodipine": {"severity": "Moderate", "message": "Increased risk of myopathy (muscle pain). Limit Simvastatin to 20mg."},
            "clarithromycin": {"severity": "High", "message": "Significant increase in statin levels; risk of rhabdomyolysis."}
        },
        "metformin": {
            "furosemide": {"severity": "Moderate", "message": "May increase metformin levels; monitor blood glucose closely."},
            "contrast": {"severity": "High", "message": "Risk of lactic acidosis if taken with iodine-based contrast (X-rays)."}
        },
        "ibuprofen": {
            "prednisone": {"severity": "High", "message": "Increased risk of gastrointestinal bleeding and ulcers."},
            "aspirin": {"severity": "Moderate", "message": "Ibuprofen can decrease the heart-protection benefit of low-dose aspirin."}
        },
        "amlodipine": {
            "grapefruit": {"severity": "Moderate", "message": "Grapefruit juice can significantly increase drug levels in your blood."}
        }
    }

    @staticmethod
    def check_interactions(new_med_name: str, existing_med_names: List[str]) -> List[Dict]:
        """Check for interactions between a new medication and existing fleet medications"""
        conflicts = []
        new_med_lower = new_med_name.lower().strip()
        
        # Check against basic database
        for existing_name in existing_med_names:
            existing_lower = existing_name.lower().strip()
            
            # Check both ways in database
            interaction = (
                MedicationInteractionService.INTERACTION_DATABASE.get(new_med_lower, {}).get(existing_lower) or
                MedicationInteractionService.INTERACTION_DATABASE.get(existing_lower, {}).get(new_med_lower)
            )
            
            if interaction:
                conflicts.append({
                    "med_a": new_med_name,
                    "med_b": existing_name,
                    "severity": interaction["severity"],
                    "message": interaction["message"]
                })
                
        return conflicts

medication_interaction_service = MedicationInteractionService()
