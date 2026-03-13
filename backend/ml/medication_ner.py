import torch
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
import logging
import re

logger = logging.getLogger(__name__)

class MedicationNER:
    """
    SOTA Clinical Named Entity Recognition using BioBERT.
    Extracts medication names and therapeutic entities from free-form text.
    Model is lazy-loaded on first call to avoid downloading at startup.
    """
    def __init__(self, model_name="d4data/biomedical-ner-all"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.nlp = None
        self.device = None
        self._loaded = False

    def _ensure_loaded(self):
        """Download and initialise the model on first use."""
        if self._loaded:
            return
        logger.info(f"Initializing BioBERT NER with model: {self.model_name}")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForTokenClassification.from_pretrained(self.model_name)
            self.nlp = pipeline("ner", model=self.model, tokenizer=self.tokenizer, aggregation_strategy="simple")
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            if self.device == "cuda":
                self.model = self.model.to(self.device)
            self._loaded = True
            logger.info(f"BioBERT NER initialized on {self.device}")
        except Exception as e:
            logger.error(f"Failed to initialize BioBERT NER: {e}")
            self.nlp = None
            self._loaded = True  # prevent retry loops

    def extract_medications(self, text):
        """
        Extracts medication names from text with improved token merging.
        """
        self._ensure_loaded()
        if not self.nlp:
            return []

        try:
            # We use simple aggregation which usually merges tokens, but can sometimes be finicky 
            # with specific subword prefixes. We'll manually clean up results.
            results = self.nlp(text)
            
            medications = []
            for res in results:
                # Target Labels for d4data/biomedical-ner-all
                target_labels = ['Medication', 'Drug', 'Chemical', 'Therapeutic_procedure']
                
                if res['entity_group'] in target_labels:
                    # Clean the word (remove ## prefixes if they survived aggregation)
                    word = res['word'].replace('##', '')
                    
                    # If this entity is immediately following the previous one, merge them
                    if medications and res['start'] <= medications[-1]['end'] + 1:
                        # Handle potential overlap or space
                        medications[-1]['text'] += word if res['start'] == medications[-1]['end'] else " " + word
                        medications[-1]['end'] = res['end']
                        medications[-1]['confidence'] = (medications[-1]['confidence'] + res['score']) / 2
                    else:
                        medications.append({
                            'text': word,
                            'start': res['start'],
                            'end': res['end'],
                            'confidence': float(res['score']),
                            'label': res['entity_group']
                        })
            
            # Final Pass: Deduplicate and filter very short non-meds
            return [m for m in medications if len(m['text']) > 2]
        except Exception as e:
            logger.error(f"NER Extraction failed: {e}")
            return []

    def get_highlighted_text(self, text, medications):
        """
        Returns text with medications wrapped in marker tags for frontend processing.
        Format: [MED]Name[/MED]
        """
        if not medications:
            return text

        # Sort medications by start position in reverse so we don't mess up offsets
        sorted_meds = sorted(medications, key=lambda x: x['start'], reverse=True)
        
        highlighted = text
        for med in sorted_meds:
            start = med['start']
            end = med['end']
            name = med['text']
            # Only highlight if confidence is high enough
            if med['confidence'] > 0.6:
                highlighted = highlighted[:start] + f"[MED]{highlighted[start:end]}[/MED]" + highlighted[end:]
        
        return highlighted

# Singleton instance
medication_ner = MedicationNER()

if __name__ == "__main__":
    # Test script
    logging.basicConfig(level=logging.INFO)
    test_ner = MedicationNER()
    sample_text = "Should I take Aspirin with Warfarin? I also take Metoprolol for my heart."
    ents = test_ner.extract_medications(sample_text)
    print(f"Text: {sample_text}")
    print(f"Entities Found: {ents}")
    print(f"Highlighted: {test_ner.get_highlighted_text(sample_text, ents)}")
