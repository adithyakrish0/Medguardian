with open('app/templates/medication/list.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix all route name and parameter mismatches
content = content.replace(
    "url_for('medication.confirm_medication', medication_id=",
    "url_for('medication.mark_taken', medication_id="
)

content =content.replace(
    "url_for('medication.delete_medication', id=",
    "url_for('medication.delete_medication', medication_id="
)

with open('app/templates/medication/list.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all route mismatches!")
