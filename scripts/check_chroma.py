import chromadb
import os

db_path = os.path.abspath("backend/data/chromadb")
print(f"Checking ChromaDB at {db_path}...")

try:
    client = chromadb.PersistentClient(path=db_path)
    collections = client.list_collections()
    print(f"Found {len(collections)} collections:")
    for col in collections:
        count = col.count()
        print(f"- {col.name} ({count} items)")
except Exception as e:
    print(f"Error checking ChromaDB: {e}")
