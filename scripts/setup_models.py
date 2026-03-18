import os
import sys
import zipfile
import requests
from tqdm import tqdm

def download_file_from_google_drive(id, destination):
    URL = "https://docs.google.com/uc?export=download"
    session = requests.Session()

    response = session.get(URL, params={'id': id}, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {'id': id, 'confirm': token}
        response = session.get(URL, params=params, stream=True)

    save_response_content(response, destination)


def get_confirm_token(response):
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            return value
    return None


def save_response_content(response, destination):
    CHUNK_SIZE = 32768
    # Get the total size of the file for the progress bar
    total_size = int(response.headers.get('content-length', 0))

    with open(destination, "wb") as f:
        with tqdm(total=total_size, unit='B', unit_scale=True, desc="Downloading Models") as pbar:
            for chunk in response.iter_content(CHUNK_SIZE):
                if chunk:  # filter out keep-alive new chunks
                    f.write(chunk)
                    pbar.update(len(chunk))


def setup_models(gdrive_id):
    """
    Main entry point for downloading and extracting models.
    """
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dir = os.path.join(project_root, 'backend', 'models', 'saved')
    temp_zip = os.path.join(project_root, 'models_temp.zip')

    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    print(f"🚀 Starting MedGuardian Model Setup...")
    print(f"📦 Workspace: {project_root}")
    
    try:
        # 1. Download
        print(f"📥 Downloading models from Google Drive (ID: {gdrive_id})...")
        download_file_from_google_drive(gdrive_id, temp_zip)
        print(f"✅ Download complete.")

        # 2. Extract
        print(f"📂 Extracting models to {target_dir}...")
        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
        print(f"✅ Extraction complete.")

        # 3. Cleanup
        print(f"🧹 Cleaning up temporary files...")
        os.remove(temp_zip)
        print(f"✨ All models are ready!")
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        sys.exit(1)


if __name__ == "__main__":
    # The User will replace this ID after uploading to Drive
    # Tutorial: https://help.cloudforge.com/hc/en-us/articles/215242303-How-to-get-Google-Drive-File-ID
    DEFAULT_GDRIVE_ID = "YOUR_GOOGLE_DRIVE_FILE_ID_HERE"
    
    print("-" * 50)
    print("🤖 MEDGUARDIAN AI MODEL SETUP WIZARD")
    print("-" * 50)
    
    if DEFAULT_GDRIVE_ID == "YOUR_GOOGLE_DRIVE_FILE_ID_HERE":
        print("⚠️  MISSING FILE ID!")
        print("Please upload your models as a .zip to Google Drive,")
        print("get the 'Sharing Link', extract the ID, and paste it into this script.")
        print("\nExample ID from link: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456")
        
        user_id = input("\nEnter GDrive File ID (or press Enter to exit): ").strip()
        if not user_id:
            sys.exit(0)
        setup_models(user_id)
    else:
        setup_models(DEFAULT_GDRIVE_ID)
