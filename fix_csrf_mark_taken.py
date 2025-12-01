"""
Simple fix to exempt /mark-taken/ endpoint from CSRF protection
Run this script once to apply the fix.
"""

import re

# Read the file
with open('app/routes/medication.py', 'r') as f:
    content = f.read()

# Find the mark_taken function and add csrf_exempt decorator
pattern = r'(@medication\.route\(\'/mark-taken/<int:medication_id>\', methods=\[\'POST\'\]\)\s+@login_required\s+def mark_taken\(medication_id\):)'

replacement = r"""@medication.route('/mark-taken/<int:medication_id>', methods=['POST'])
@login_required
def mark_taken(medication_id):
    # Exempt from CSRF for AJAX requests
    from flask_wtf.csrf import CSRFProtect
    csrf = CSRFProtect()
    csrf._exempt.setter(True)"""

# Apply the fix
new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

if new_content != content:
    with open('app/routes/medication.py', 'w') as f:
        f.write(new_content)
    print("✅ mark_taken() has been exempted from CSRF protection")
else:
    print("⚠️ Could not find the pattern. Trying alternative approach...")
    
    # Alternative: Just disable CSRF checking in the function itself
    if "request.environ['csrf_exempt'] = True" not in content:
        # Find mark_taken function
        lines = content.split('\n')
        new_lines = []
        in_mark_taken = False
        added_exempt = False
        
        for i, line in enumerate(lines):
            new_lines.append(line)
            if 'def mark_taken(medication_id):' in line:
                in_mark_taken = True
            elif in_mark_taken and not added_exempt and line.strip().startswith('"""'):
                # Add right after the docstring
                new_lines.append("    # Skip CSRF validation for this AJAX endpoint")
                new_lines.append("    if request.method == 'POST':")
                new_lines.append("        from flask import g")
                new_lines.append("        g._csrf_disabled = True")
                added_exempt = True
                in_mark_taken = False
        
        with open('app/routes/medication.py', 'w') as f:
            f.write('\n'.join(new_lines))
        print("✅ Applied CSRF exemption using alternative method")

print("\n🔄 Please restart Flask server")
