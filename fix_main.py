# Manual fix script for main.py app context bug
# This script removes all unnecessary app context creations

import re

# Read the file
with open('app/routes/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the problematic code blocks
# Matches: create_app import, app = create_app(), and with app.app_context():
pattern = r'\s*# Create app context.*?\n\s*from app import create_app\n\s*app = create_app\(\)\s*\n\s*with app\.app_context\(\):\n'

# Count occurrences
matches = list(re.finditer(pattern, content, re.MULTILINE | re.DOTALL))
print(f"Found {len(matches)} app context blocks to remove")

# Remove the pattern
fixed_content = re.sub(pattern, '\n', content, flags=re.MULT LINE | re.DOTALL)

# Also need to dedent the code that was inside the with blocks
# This is complex, so we'll create a backup first
with open('app/routes/main.py.backup', 'w', encoding='utf-8') as f:
    f.write(content)
    print("Created backup: main.py.backup")

# Write fixed content
with open('app/routes/main.py.fixed', 'w', encoding='utf-8') as f:
    f.write(fixed_content)
    print("Created fixed version: main.py.fixed")
    print("\nReview main.py.fixed and if correct, rename it to main.py")
