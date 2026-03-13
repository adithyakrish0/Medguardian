import os
import sys

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ml.rag_assistant import rag_assistant
import logging

# Setup logging to see what's happening
logging.basicConfig(level=logging.INFO)

import traceback

def test_assistant():
    print("\n--- Testing MedGuardian AI Assistant ---")
    
    try:
        # Test 1: Drug Interaction (Critical requirement)
        query_1 = "Can I take Ibuprofen with Lisinopril?"
        print(f"\nUser: {query_1}")
        result_1 = rag_assistant.query(query_1)
        print(f"Assistant: {result_1['response']}")
        print(f"(Latency: {result_1['latency_ms']}ms)")
        
        # Test 2: General question
        query_2 = "What should I do if I miss a dose of Aspirin?"
        print(f"\nUser: {query_2}")
        result_2 = rag_assistant.query(query_2)
        print(f"Assistant: {result_2['response']}")
        print(f"(Latency: {result_2['latency_ms']}ms)")
        
    except Exception as e:
        print(f"\nFATAL ERROR during test: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_assistant()
