import zipfile
import os
import sys

def extract_zip(zip_path, dest_path):
    print(f"Extracting {zip_path} to {dest_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Get list of files to show progress
            files = zip_ref.namelist()
            total = len(files)
            for i, file in enumerate(files):
                zip_ref.extract(file, dest_path)
                if i % 10 == 0 or i == total - 1:
                    print(f"Progress: {i+1}/{total} files extracted")
        print("Extraction complete!")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Create dirs
    os.makedirs("backend/models/saved/llama-medguardian", exist_ok=True)
    os.makedirs("backend/data/chromadb", exist_ok=True)
    
    # Extract model
    extract_zip("MedGuardian_V1_Merged.zip", "backend/models/saved/llama-medguardian")
    
    # Extract chroma
    extract_zip("chromadb_archive.zip", "backend/data/chromadb")
