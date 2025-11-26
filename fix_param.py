with open('app/templates/medication/list.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("url_for('medication.edit_medication', id=", "url_for('medication.edit_medication', medication_id=")

with open('app/templates/medication/list.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
