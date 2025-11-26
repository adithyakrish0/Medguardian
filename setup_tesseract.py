"""
Tesseract OCR Setup Script for MedGuardian
Automatically downloads and installs Tesseract OCR on Windows
"""

import os
import sys
import subprocess
import urllib.request
import platform

def check_tesseract_installed():
    """Check if Tesseract is already installed"""
    try:
        result = subprocess.run(['tesseract', '--version'], 
                              capture_output=True, 
                              text=True,
                              timeout=5)
        if result.returncode == 0:
            print("✅ Tesseract is already installed!")
            print(result.stdout.split('\n')[0])
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return False

def download_tesseract_installer():
    """Download the Tesseract installer for Windows"""
    print("\n📥 Downloading Tesseract OCR installer...")
    
    # Use the latest stable Windows installer from UB-Mannheim
    installer_url = "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
    installer_path = "tesseract_installer.exe"
    
    try:
        print(f"Downloading from: {installer_url}")
        urllib.request.urlretrieve(installer_url, installer_path)
        print(f"✅ Downloaded to: {os.path.abspath(installer_path)}")
        return installer_path
    except Exception as e:
        print(f"❌ Error downloading installer: {e}")
        return None

def install_tesseract(installer_path):
    """Run the Tesseract installer"""
    print("\n🔧 Installing Tesseract OCR...")
    print("⚠️  The installer window will open. Please follow these steps:")
    print("   1. Click 'Next' through the installer")
    print("   2. Accept the license agreement")
    print("   3. Use the default installation path (C:\\Program Files\\Tesseract-OCR)")
    print("   4. Click 'Install' and wait for completion")
    print("   5. Click 'Finish'")
    print("\nPress Enter when ready to start the installer...")
    input()
    
    try:
        # Run the installer
        subprocess.run([installer_path], check=True)
        print("✅ Installer completed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Installation failed: {e}")
        return False

def add_to_path():
    """Instructions for adding Tesseract to PATH"""
    print("\n📝 Important: Adding Tesseract to your PATH")
    print("\nTesseract should be automatically added to your PATH.")
    print("However, if you encounter issues, manually add:")
    print("  C:\\Program Files\\Tesseract-OCR")
    print("\nTo your system PATH environment variable.")
    print("\nYou may need to restart your terminal/IDE for changes to take effect.")

def verify_installation():
    """Verify that Tesseract is working"""
    print("\n🔍 Verifying installation...")
    print("Please close this window and open a NEW terminal window.")
    print("Then run: tesseract --version")
    print("\nIf you see version information, installation was successful!")

def manual_installation_guide():
    """Provide manual installation instructions"""
    print("\n" + "="*70)
    print("MANUAL INSTALLATION GUIDE")
    print("="*70)
    print("\n1. Visit: https://github.com/UB-Mannheim/tesseract/wiki")
    print("\n2. Download the latest Windows installer:")
    print("   - Look for 'tesseract-ocr-w64-setup-X.X.X.exe' (64-bit)")
    print("\n3. Run the installer:")
    print("   - Accept the license")
    print("   - Install to: C:\\Program Files\\Tesseract-OCR")
    print("   - Complete the installation")
    print("\n4. Add to PATH (if not automatic):")
    print("   - Open 'Environment Variables' in Windows")
    print("   - Edit 'Path' in 'System variables'")
    print("   - Add: C:\\Program Files\\Tesseract-OCR")
    print("\n5. Verify installation:")
    print("   - Open a NEW terminal")
    print("   - Run: tesseract --version")
    print("\n6. For MedGuardian, you may also need to set in .env:")
    print("   TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe")
    print("="*70)

def main():
    print("="*70)
    print("MedGuardian - Tesseract OCR Setup")
    print("="*70)
    
    # Check OS
    if platform.system() != 'Windows':
        print("\n⚠️  This script is designed for Windows.")
        print("\nFor other operating systems:")
        print("  - macOS: brew install tesseract")
        print("  - Linux: sudo apt-get install tesseract-ocr")
        return
    
    # Check if already installed
    if check_tesseract_installed():
        print("\nNo action needed. Tesseract is ready to use!")
        return
    
    print("\n❌ Tesseract OCR is not installed.")
    print("\nThis script will:")
    print("  1. Download the Tesseract installer")
    print("  2. Run the installer (you'll need to click through it)")
    print("  3. Verify the installation")
    
    choice = input("\nWould you like to proceed? (yes/no): ").strip().lower()
    
    if choice not in ['yes', 'y']:
        print("\n📚 Showing manual installation guide instead...")
        manual_installation_guide()
        return
    
    # Download installer
    installer_path = download_tesseract_installer()
    if not installer_path:
        print("\n❌ Could not download installer.")
        manual_installation_guide()
        return
    
    # Install
    if not install_tesseract(installer_path):
        print("\n❌ Installation did not complete successfully.")
        manual_installation_guide()
        return
    
    # Clean up
    try:
        os.remove(installer_path)
        print(f"\n🧹 Cleaned up installer file")
    except:
        pass
    
    # Post-installation steps
    add_to_path()
    verify_installation()
    
    print("\n✅ Setup complete!")
    print("\n⚠️  IMPORTANT: Restart your terminal/IDE before using Tesseract")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        print("\nPlease use the manual installation guide:")
        manual_installation_guide()
