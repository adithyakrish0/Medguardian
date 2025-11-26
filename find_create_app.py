"""Find all create_app instances in main.py"""
with open(r'C:\Users\Adithyakrishnan\Desktop\Medguardian\app\routes\main.py', 'r') as f:
    lines = f.readlines()
    
for i, line in enumerate(lines, 1):
    if 'create_app' in line:
        print(f"Line {i}: {line.rstrip()}")
