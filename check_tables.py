import sqlite3
conn = sqlite3.connect('instance/medguardian.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", [r[0] for r in cursor.fetchall()])
conn.close()
