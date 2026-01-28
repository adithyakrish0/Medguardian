# How MedGuardian "Remembers" Medicine

This document explains the "Magic" behind the medicine recognition feature in the POC.

## 1. The "DNA" of a Medicine Bottle (Registration)
When you click **"Register"**, the system doesn't just save a photo. It performs a process called **Feature Extraction**:

1.  **Finding Keypoints**: The AI looks for unique "interest points" on the bottle—corners of the label, sharp edges of the text, the logo, or unique patterns on the cap. Let's call these "Stars."
2.  **Generating Descriptors**: For every "Star," the AI calculates a unique mathematical code (a Descriptor). This code describes what the area *around* that star looks like (e.g., "dark on top, bright on left, text curve below").
3.  **The Result**: The system saves a file (e.g., `Aspirin.npz`) containing thousands of these mathematical codes. This is the "Visual DNA."

---

## 2. The "Matching" Process (Detection)
When you click **"Start Scanning"**, the camera is sending a live stream of frames (images) to the backend. Here is what happens every 500ms:

1.  **Extracting Frames**: The camera takes a snapshot of what it currently sees.
2.  **Live Extraction**: The AI finds "Stars" in that *live* frame and calculates their "Descriptors" instantly.
3.  **Brute Force Matching**: It compares the descriptors from the Live Frame to the descriptors stored in your Database (`Aspirin.npz`, `Tylenol.npz`, etc.). 
4.  **Finding the Best Fit**: 
    - If it finds 20 "Stars" in the live frame that match the mathematical code of the "Stars" in the Aspirin file, it's a "Potential Match."
    - If it finds 100+ matches, it's a **"Hit."**

---

## 3. Why this is better than "Standard AI"
| Feature | Traditional AI (YOLO) | Our POC (ORB Matching) |
| :--- | :--- | :--- |
| **New Items** | Needs thousands of photos + training time. | Works instantly with **one** photo. |
| **Hardware** | Heavy GPU usage. | Lightweight CPU/GPU usage. |
| **Text** | Struggles with small fonts. | Loves text! (Text creates many unique keypoints). |
| **Rotation** | Needs to see all angles. | Recognizes the item even if it's turned or tilted. |

## 4. How the AR Overlay knows where to go
In the final implementation, we use **Homography**.
- Once we have 4 matching corners, the AI calculates the **Perspective Wrap**.
- It says: "If these 4 dots from the original photo moved to *these* 4 coordinates in the camera, the box must be exactly *here*."
- We then draw the green AR box on those calculated coordinates.
