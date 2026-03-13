import os
import chromadb
from chromadb.utils import embedding_functions

DB_PATH = os.path.abspath("backend/data/chromadb")
COLLECTION_NAME = "medguardian_knowledge"

def fix_chroma():
    print(f"Connecting to Chroma at {DB_PATH}...")
    client = chromadb.PersistentClient(path=DB_PATH)
    
    try:
        # Check if collection exists
        collections = client.list_collections()
        col_names = [c.name for c in collections]
        
        if COLLECTION_NAME in col_names:
            print(f"Collection '{COLLECTION_NAME}' found. Deleting to resolve embedding mismatch...")
            client.delete_collection(name=COLLECTION_NAME)
            print("Successfully deleted collection.")
        else:
            print(f"Collection '{COLLECTION_NAME}' not found. Nothing to delete.")
            
        # Re-initialize the same way RAGAssistant does
        print("Re-creating collection with correct embedding function...")
        embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        collection = client.create_collection(
            name=COLLECTION_NAME,
            embedding_function=embedding_fn
        )
        print(f"Successfully re-created collection '{COLLECTION_NAME}'.")
        
    except Exception as e:
        print(f"Error fixing ChromaDB: {e}")

if __name__ == "__main__":
    fix_chroma()
