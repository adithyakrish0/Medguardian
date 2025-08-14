import os
import requests
import zipfile
import shutil
import random
import cv2
import pandas as pd
from tqdm import tqdm
from pycocotools.coco import COCO
from ultralytics import YOLO

# Download COCO dataset
print("Downloading COCO dataset...")
os.makedirs('coco_dataset', exist_ok=True)

# Function to download a file
def download_file(url, file_path):
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    block_size = 1024
    progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)
    
    with open(file_path, 'wb') as file:
        for data in response.iter_content(block_size):
            progress_bar.update(len(data))
            file.write(data)
    progress_bar.close()

# Download files
print("Downloading images and annotations...")
download_file("http://images.cocodataset.org/zips/train2017.zip", "coco_dataset/train2017.zip")
download_file("http://images.cocodataset.org/zips/val2017.zip", "coco_dataset/val2017.zip")
download_file("http://images.cocodataset.org/annotations/annotations_trainval2017.zip", "coco_dataset/annotations_trainval2017.zip")

# Extract datasets
print("Extracting datasets...")
with zipfile.ZipFile('coco_dataset/train2017.zip', 'r') as zip_ref:
    zip_ref.extractall('coco_dataset')
with zipfile.ZipFile('coco_dataset/val2017.zip', 'r') as zip_ref:
    zip_ref.extractall('coco_dataset')
with zipfile.ZipFile('coco_dataset/annotations_trainval2017.zip', 'r') as zip_ref:
    zip_ref.extractall('coco_dataset')

# Initialize COCO API
print("Initializing COCO API...")
coco = COCO('coco_dataset/annotations/instances_train2017.json')

# Get bottle category ID
cat_ids = coco.getCatIds(catNms=['bottle'])
img_ids = coco.getImgIds(catIds=cat_ids)

# Create medicine dataset directories
print("Creating medicine bottle dataset...")
os.makedirs('medicine_bottle_dataset/images/train', exist_ok=True)
os.makedirs('medicine_bottle_dataset/images/val', exist_ok=True)
os.makedirs('medicine_bottle_dataset/images/test', exist_ok=True)
os.makedirs('medicine_bottle_dataset/labels/train', exist_ok=True)
os.makedirs('medicine_bottle_dataset/labels/val', exist_ok=True)
os.makedirs('medicine_bottle_dataset/labels/test', exist_ok=True)

# Copy bottle images and convert annotations
print("Processing bottle images...")
medicine_images = []

# Limit to 500 images for manageable training
for img_id in img_ids[:500]:
    img_info = coco.loadImgs(img_id)[0]
    medicine_images.append(img_info['file_name'])
    
    # Copy image
    src_path = f'coco_dataset/train2017/{img_info["file_name"]}'
    dst_path = f'medicine_bottle_dataset/images/train/{img_info["file_name"]}'
    
    if os.path.exists(src_path):
        shutil.copy(src_path, dst_path)
        
        # Get annotations
        ann_ids = coco.getAnnIds(imgIds=img_id, catIds=cat_ids)
        anns = coco.loadAnns(ann_ids)
        
        # Create YOLO format annotation
        with open(f'medicine_bottle_dataset/labels/train/{img_info["file_name"].replace(".jpg", ".txt")}', 'w') as f:
            for ann in anns:
                # Convert to YOLO format
                x_center = (ann['bbox'][0] + ann['bbox'][2]/2) / img_info['width']
                y_center = (ann['bbox'][1] + ann['bbox'][3]/2) / img_info['height']
                width = ann['bbox'][2] / img_info['width']
                height = ann['bbox'][3] / img_info['height']
                
                f.write(f"0 {x_center} {y_center} {width} {height}\n")

# Also get some validation images from val2017
coco_val = COCO('coco_dataset/annotations/instances_val2017.json')
val_cat_ids = coco_val.getCatIds(catNms=['bottle'])
val_img_ids = coco_val.getImgIds(catIds=val_cat_ids)

# Get 100 validation images
for img_id in val_img_ids[:100]:
    img_info = coco_val.loadImgs(img_id)[0]
    medicine_images.append(img_info['file_name'])
    
    # Copy image
    src_path = f'coco_dataset/val2017/{img_info["file_name"]}'
    dst_path = f'medicine_bottle_dataset/images/val/{img_info["file_name"]}'
    
    if os.path.exists(src_path):
        shutil.copy(src_path, dst_path)
        
        # Get annotations
        ann_ids = coco_val.getAnnIds(imgIds=img_id, catIds=val_cat_ids)
        anns = coco_val.loadAnns(ann_ids)
        
        # Create YOLO format annotation
        with open(f'medicine_bottle_dataset/labels/val/{img_info["file_name"].replace(".jpg", ".txt")}', 'w') as f:
            for ann in anns:
                # Convert to YOLO format
                x_center = (ann['bbox'][0] + ann['bbox'][2]/2) / img_info['width']
                y_center = (ann['bbox'][1] + ann['bbox'][3]/2) / img_info['height']
                width = ann['bbox'][2] / img_info['width']
                height = ann['bbox'][3] / img_info['height']
                
                f.write(f"0 {x_center} {y_center} {width} {height}\n")

print(f"Processed {len(medicine_images)} bottle images")

# Create test set by moving some validation images
val_images = [f for f in os.listdir('medicine_bottle_dataset/images/val') if f.endswith('.jpg')]
random.shuffle(val_images)

# Move 20% of validation images to test set
test_count = int(0.2 * len(val_images))
for img_file in val_images[:test_count]:
    # Move image
    shutil.move(
        os.path.join('medicine_bottle_dataset/images/val', img_file),
        os.path.join('medicine_bottle_dataset/images/test', img_file)
    )
    
    # Move corresponding label
    label_file = img_file.replace('.jpg', '.txt')
    shutil.move(
        os.path.join('medicine_bottle_dataset/labels/val', label_file),
        os.path.join('medicine_bottle_dataset/labels/test', label_file)
    )

print("Dataset split complete!")

# Create dataset configuration YAML
dataset_config = """
path: ./medicine_bottle_dataset
train: images/train
val: images/val
test: images/test

# Classes
names:
  0: bottle
"""

with open('medicine_bottle.yaml', 'w') as f:
    f.write(dataset_config)

print("Dataset configuration file created!")

# Load a pre-trained YOLOv8 model
print("Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')  # Using nano version for faster training

# Train the model
print("Training YOLOv8 model...")
results = model.train(
    data='medicine_bottle.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    name='medicine_bottle_detector'
)

print("Training complete!")

# Evaluate model performance
print("Evaluating model...")
metrics = model.val()

# Test on a sample image
sample_image = 'medicine_bottle_dataset/images/val/' + os.listdir('medicine_bottle_dataset/images/val')[0]
results = model(sample_image)

# Visualize results
results[0].show()

print("Model training and evaluation complete!")
print(f"Model saved to: runs/detect/medicine_bottle_detector/weights/best.pt")