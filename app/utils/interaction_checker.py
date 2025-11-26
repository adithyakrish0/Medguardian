"""
Enhanced interaction checker with NIH RxNav API integration
"""
import requests
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

# Extended interaction database
EXTENDED_INTERACTIONS = [
    {
        'medication1': 'Aspirin',
        'medication2': 'Ibuprofen',
        'severity': 'major',
        'description': 'Both medications are NSAIDs and increase the risk of gastrointestinal bleeding and stomach ulcers when taken together.',
        'recommendation': 'Avoid taking both medications simultaneously. Space them at least 2-4 hours apart. Consult your doctor about alternative pain relievers.',
        'source': 'DrugBank',
        'risk_factors': ['elderly', 'history_of_stomach_issues', 'high_dosage']
    },
    {
        'medication1': 'Warfarin',
        'medication2': 'Aspirin',
        'severity': 'critical',
        'description': 'Both medications increase bleeding risk. Aspirin can enhance the anticoagulant effect of warfarin.',
        'recommendation': 'Extreme caution required. This combination should only be used under strict medical supervision with frequent INR monitoring.',
        'source': 'FDA',
        'risk_factors': ['elderly', 'liver_disease', 'renal_impairment']
    },
    {
        'medication1': 'Lisinopril',
        'medication2': 'Potassium supplements',
        'severity': 'moderate',
        'description': 'Lisinopril can increase potassium levels in the blood. Taking potassium supplements may lead to hyperkalemia.',
        'recommendation': 'Monitor potassium levels regularly. Avoid potassium supplements unless specifically prescribed by your doctor.',
        'source': 'DrugBank',
        'risk_factors': ['diabetes', 'kidney_disease', 'elderly']
    },
    {
        'medication1': 'Metformin',
        'medication2': 'Iodinated contrast dye',
        'severity': 'major',
        'description': 'Metformin should be temporarily discontinued before and after procedures involving iodinated contrast dye to prevent lactic acidosis.',
        'recommendation': 'Discontinue metformin 48 hours before procedure and restart 48 hours after, only if renal function is normal.',
        'source': 'FDA',
        'risk_factors': ['renal_impairment', 'dehydration', 'multiple_procedures']
    },
    {
        'medication1': 'Simvastatin',
        'medication2': 'Grapefruit juice',
        'severity': 'major',
        'description': 'Grapefruit juice can significantly increase simvastatin blood levels, increasing the risk of muscle damage and rhabdomyolysis.',
        'recommendation': 'Avoid grapefruit juice completely while taking simvastatin. Check for other citrus fruits that may interact.',
        'source': 'DrugBank',
        'risk_factors': ['high_dosage', 'elderly', 'renal_impairment']
    },
    {
        'medication1': 'Prednisone',
        'medication2': 'Ibuprofen',
        'severity': 'moderate',
        'description': 'Both increase risk of stomach bleeding and ulcers.',
        'recommendation': 'Use together only under doctor supervision. Take with food.',
        'source': 'NIH',
        'risk_factors': ['elderly', 'high_dosage', 'long_term_use']
    },
    {
        'medication1': 'Metoprolol',
        'medication2': 'Verapamil',
        'severity': 'major',
        'description': 'Both slow heart rate and can cause dangerously slow heartbeat.',
        'recommendation': 'Requires careful monitoring. Do not combine without cardiologist approval.',
        'source': 'FDA',
        'risk_factors': ['heart_disease', 'elderly']
    },
    {
        'medication1': 'Levothyroxine',
        'medication2': 'Calcium supplements',
        'severity': 'moderate',
        'description': 'Calcium can reduce absorption of thyroid medication.',
        'recommendation': 'Take levothyroxine 4 hours before or after calcium.',
        'source': 'DrugBank',
        'risk_factors': ['thyroid_disease']
    }
]

class InteractionChecker:
    """Enhanced interaction checker with local database and optional API integration"""
    
    def __init__(self, use_api=False):
        self.use_api = use_api
        self.api_base_url = "https://rxnav.nlm.nih.gov/REST"
    
    def check_interactions(self, medication_names: List[str]) -> List[Dict]:
        """
        Check for interactions between medications
        
        Args:
            medication_names: List of medication names
            
        Returns:
            List of interaction dictionaries
        """
        interactions = []
        
        # Check local database first
        interactions.extend(self._check_local_database(medication_names))
        
        # Optionally check NIH RxNav API
        if self.use_api:
            try:
                api_interactions = self._check_rxnav_api(medication_names)
                interactions.extend(api_interactions)
            except Exception as e:
                logger.error(f"API interaction check failed: {e}")
        
        # Remove duplicates
        unique_interactions = {
            (i['medication1'], i['medication2']): i for i in interactions
        }.values()
        
        return list(unique_interactions)
    
    def _check_local_database(self, medication_names: List[str]) -> List[Dict]:
        """Check local interaction database"""
        interactions_found = []
        
        # Normalize names
        med_names_lower = [name.lower().strip() for name in medication_names]
        
        for interaction in EXTENDED_INTERACTIONS:
            med1 = interaction['medication1'].lower()
            med2 = interaction['medication2'].lower()
            
            if med1 in med_names_lower and med2 in med_names_lower:
                interactions_found.append(interaction.copy())
        
        return interactions_found
    
    def _check_rxnav_api(self, medication_names: List[str]) -> List[Dict]:
        """
        Check NIH RxNav API for interactions (optional)
        
        Note: This is a simplified implementation. Full integration would
        require mapping medication names to RxCUI codes first.
        """
        api_interactions = []
        
        # This is a placeholder - full implementation would:
        # 1. Map medication names to RxCUI codes
        # 2. Call the interaction API for each pair
        # 3. Parse and format results
        
        logger.info("API check would be performed here in production")
        
        return api_interactions

# Global instance
interaction_checker = InteractionChecker(use_api=False)
