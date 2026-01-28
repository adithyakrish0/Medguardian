# MedGuardian Vision POC: Running the Test

This standalone folder tests the **Medicine Registration & AR Overlay** feature.

## 1. Preparation
Ensure you have the dependencies installed:
```bash
pip install flask flask-cors opencv-python numpy
```

## 2. Start the Backend
Navigate to the backend folder and run the Flask server:
```bash
cd Medguardian_Vision_POC/backend
python app.py
```
*The server will run on `http://localhost:5005`.*

## 3. Run the Frontend
You don't need a dev server! Just open the following file in your Chrome or Edge browser:
- `Medguardian_Vision_POC/frontend/index.html`

## 4. How to Test
1. **Registration**: 
   - Click "Register New".
   - Hold a medicine box or strip steady in front of the camera.
   - Enter a name (e.g., "Aspirin").
   - This saves the visual "fingerprint" of the item.
2. **Verification (The AR part)**:
   - Click "Start Scanning".
   - Bring the same medicine item back into the camera frame.
   - **Expected Result**: A green glowing AR box will appear over the video, and the system will identify the medicine as "Aspirin".
3. **Database Integration**:
   - In the POC, "Success" is printed to the console and shown in the UI. In the final version, this same logic will trigger the `@medication.mark_taken` API call.

## Why this works well for you:
- **No Training Needed**: Unlike YOLO, ORB feature matching works instantly as soon as you "register" a box.
- **Hardware Efficient**: It runs entirely on your CPU/GPU without needing a massive neural network for every new item.
- **Robust**: It looks for textures and text, making it highly accurate for medicine packaging.
