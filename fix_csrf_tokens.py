# Quick CSRF Token Fixer
# Adds CSRF tokens to all forms missing them

import os
import re

forms_fixed = 0
files_checked = 0

# Templates to fix
template_dir = 'app/templates'

for root, dirs, files in os.walk(template_dir):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            files_checked += 1
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file has forms
            if '<form' in content.lower():
                # Check if CSRF token already exists
                if 'csrf_token' not in content.lower():
                    # Add CSRF token after each <form> tag
                    updated_content = re.sub(
                        r'(<form[^>]*>)',
                        r'\1\n                        <input type="hidden" name="csrf_token" value="{{ csrf_token() }}"/>',
                        content,
                        flags=re.IGNORECASE
                    )
                    
                    if updated_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(updated_content)
                        print(f"✓ Fixed: {filepath}")
                        forms_fixed += 1

print(f"\n{'='*60}")
print(f"FILES CHECKED: {files_checked}")
print(f"FORMS FIXED: {forms_fixed}")
print(f"{'='*60}")
