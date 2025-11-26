"""
Script to automatically remove unnecessary app context wrappers from main.py
"""
import re

def remove_app_context_wrappers(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match the unnecessary app context blocks
    # This matches:
    #   - "# Create app context..." comment
    #   - "from app import create_app" line
    #   - Optional other import lines
    #   - "app = create_app()" line
    #   - Optional blank line
    #   - "with app.app_context():" line
    
    # We'll do this line by line for better control
    lines = content.split('\n')
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is the start of an app context block
        if '# Create app context for database operations' in line:
            # Skip the comment
            i += 1
            
            # Skip "from app import create_app" (might be mixed with other imports)
            while i < len(lines) and ('from app import create_app' in lines[i] or 
                                      (lines[i].strip().startswith('from ') and 'import' in lines[i])):
                # Keep non-create_app imports
                if 'create_app' not in lines[i] and lines[i].strip():
                    new_lines.append(lines[i])
                i += 1
            
            # Skip blank lines
            while i < len(lines) and not lines[i].strip():
                i += 1
            
            # Skip "app = create_app()"
            if i < len(lines) and 'app = create_app()' in lines[i]:
                i += 1
            
            # Skip blank lines
            while i < len(lines) and not lines[i].strip():
                i += 1
            
            # Skip "with app.app_context():"
            if i < len(lines) and 'with app.app_context():' in lines[i]:
                indent_to_remove = len(lines[i]) - len(lines[i].lstrip())
                i += 1
                
                # Now dedent all following lines until we find the matching closing or reduced indentation
                while i < len(lines):
                    current_line = lines[i]
                    
                    # If it's a blank line, keep it
                    if not current_line.strip():
                        new_lines.append(current_line)
                        i += 1
                        continue
                    
                    # Check current indentation
                    current_indent = len(current_line) - len(current_line.lstrip())
                    
                    # If indentation is less than or equal to the 'with' statement, we're done with this block
                    if current_indent <= indent_to_remove:
                        # Don't increment i, we want to process this line normally
                        break
                    
                    # Dedent this line by 4 spaces (one level)
                    dedented_line = current_line[4:] if current_line.startswith('    ') else current_line
                    new_lines.append(dedented_line)
                    i += 1
        else:
            new_lines.append(line)
            i += 1
    
    # Write back
    new_content = '\n'.join(new_lines)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Successfully removed app context wrappers from main.py")
    print("Fixed instances found at lines: 28-32, 199-203, 392-398")

if __name__ == '__main__':
    remove_app_context_wrappers(r'C:\Users\Adithyakrishnan\Desktop\Medguardian\app\routes\main.py')
