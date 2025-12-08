# 🛠️ MedGuardian - Complete Setup Guide

This guide will help you get MedGuardian running on your local machine in under 10 minutes.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Python 3.8 or higher** ([Download](https://www.python.org/downloads/))
- ✅ **pip** (comes with Python)
- ✅ **Git** ([Download](https://git-scm.com/downloads))
- ⭐ **Tesseract OCR** (Optional but recommended) ([Download](https://github.com/UB-Mannheim/tesseract/wiki))

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get the Code

```bash
# Clone the repository
git clone https://github.com/adithyakrish0/Medguardian.git

# Navigate to directory
cd Medguardian
```

### Step 2: Set Up Python Environment

**Windows:**
```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\\Scripts\\activate
```

**Linux/Mac:**
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install all required packages:
- Flask 2.3+
- SQLAlchemy
- Flask-SocketIO
- OpenCV
- And more...

### Step 4: Configuration

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your preferred settings (optional - defaults work):

```env
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///medguardian.db
```

### Step 5: Initialize Database

```bash
python
```

Then in Python:
```python
from app import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print("Database created!")
exit()
```

### Step 6: Run the Application

```bash
python run.py
```

You should see:
```
* Serving Flask app 'app'
* Debug mode: on
* Running on http://127.0.0.1:5001
```

### Step 7: Open in Browser

Navigate to: **http://localhost:5001**

---

## 🎯 Creating Your First Account

1. **Register as Senior**
   - Click "Register"
   - Username: `john_senior`
   - Email: `john@example.com`
   - Password: `SecurePass123` (min 8 chars, 1 uppercase, 1 digit)
   - Role: **Senior Citizen**
   - Click "Register"

2. **Login**
   - Use credentials you just created
   - You'll see the Senior Dashboard

3. **Add First Medication**
   - Click "Add Medication" button
   - Fill in:
     - Name: `Aspirin`
     - Dosage: `100mg`
     - Frequency: `Daily`
     - Check "Morning" box
   - Click "Save"

4. **Test Quick Reminder**
   - Go to `/quick-test` in browser
   - Click "Create Test Medication"
   - Wait 2 minutes
   - You'll get a browser notification!

---

## 🧪 Testing the System

### Test Real-Time Reminders

1. **Quick Test Feature**
```
http://localhost:5001/quick-test
```
- Creates medication due in 2 minutes
- Tests scheduler and notifications

2. **Verify Notification Appears**
- Allow browser notifications when prompted
- Wait 2 minutes
- Should see popup notification

### Test Visual Verification

1. **Go to Verification Page**
```
http://localhost:5001/medication/verification
```

2. **Capture Reference Image**
- Allow camera access
- Hold medication bottle in view
- Click "Capture Reference"

3. **Verify Later**
- Go back to verification page
- Show bottle again
- Click "Verify"
- See similarity score!

---

## 🔧 Advanced Setup

### Install Tesseract OCR (Recommended)

**Windows:**
1. Download: https://github.com/UB-Mannheim/tesseract/wiki
2. Run installer
3. Add to PATH: `C:\\Program Files\\Tesseract-OCR`
4. Restart terminal

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

**Mac:**
```bash
brew install tesseract
```

### PostgreSQL (Production)

For production use, switch from SQLite to PostgreSQL:

1. **Install PostgreSQL**
```bash
# Ubuntu
sudo apt-get install postgresql postgresql-contrib

# Mac
brew install postgresql
```

2. **Create Database**
```bash
sudo -u postgres psql
CREATE DATABASE medguardian;
CREATE USER medguard WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE medguardian TO medguard;
\\q
```

3. **Update .env**
```env
DATABASE_URL=postgresql://medguard:yourpassword@localhost/medguardian
```

### Redis (for SocketIO Scaling)

For multiple workers:

1. **Install Redis**
```bash
# Ubuntu
sudo apt-get install redis-server

# Mac
brew install redis
```

2. **Start Redis**
```bash
redis-server
```

3. **Update .env**
```env
SOCKETIO_MESSAGE_QUEUE=redis://localhost:6379/0
```

---

## 🐛 Troubleshooting

### Issue: Import Errors

**Error**: `ModuleNotFoundError: No module named 'flask'`

**Fix**:
```bash
# Make sure virtual environment is activated
# You should see (venv) in terminal

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: Database Errors

**Error**: `OperationalError: no such table`

**Fix**:
```bash
# Recreate database
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.drop_all()  # Warning: deletes all data
...     db.create_all()
>>> exit()
```

### Issue: Port Already in Use

**Error**: `OSError: [Errno 48] Address already in use`

**Fix**:
```bash
# Find process using port 5001
# Windows
netstat -ano | findstr :5001

# Linux/Mac
lsof -i :5001

# Kill the process or use different port in .env
PORT=5002
```

### Issue: SocketIO 404 Errors

**Error**: `GET /socket.io/?EIO=4... 404 Not Found`

**Fix**:
- Restart the server completely
- Clear browser cache (Ctrl+Shift+R)
- Check that server shows "SocketIO initialized"

### Issue: No Notifications

**Problem**: Reminders don't appear

**Fixes**:
1. **Allow browser notifications**
   - Check browser permissions
   - Click lock icon → Notifications → Allow

2. **Check scheduler is running**
   - Server logs should show "Scheduler started"
   - Should see "Checking medications" every 60s

3. **Verify time is in future**
   - Custom times must be ahead of current time
   - Use Quick Test to create medication 2 min from now

---

## 📱 Mobile Access

### Local Network Access

1. **Find Your IP**
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

2. **Update Flask Config**
```bash
python run.py --host=0.0.0.0
```

3. **Access from Phone**
```
http://YOUR_IP:5001
```

---

## 🔐 Security Notes

### Development vs Production

**Development** (current setup):
- ✅ Debug mode ON
- ✅ SQLite database
- ✅ Simple secret key
- ❌ No HTTPS

**Production** (for deployment):
- ❌ Debug mode OFF
- ✅ PostgreSQL database
- ✅ Strong secret key (generate with `python -c "import os; print(os.urandom(24).hex())"`)
- ✅ HTTPS enabled
- ✅ Environment variables secure

### Generating Secure Secret Key

```bash
python -c "import os; print(os.urandom(24).hex())"
```

Copy output to `.env`:
```env
SECRET_KEY=your_generated_key_here
```

---

## 📊 Database Management

### View Database

```bash
# Install SQLite browser
# Windows: Download from https://sqlitebrowser.org/

# Or use command line
sqlite3 instance/medguardian.db
.tables
SELECT * FROM user;
.quit
```

### Backup Database

```bash
# Copy database file
cp instance/medguardian.db instance/medguardian_backup.db
```

### Reset Everything

```bash
# Delete database
rm instance/medguardian.db

# Recreate
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.create_all()
>>> exit()
```

---

## 🎯 Next Steps

After setup, you should:

1. ✅ **Test All Features**
   - Add medications
   - Set reminders
   - Test verification
   - Check caregiver dashboard

2. ✅ **Read Documentation**
   - [README.md](README.md) - Overview
   - [API.md](docs/API.md) - API Reference
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Development Guide

3. ✅ **Customize**
   - Add your logo
   - Change color scheme
   - Customize email templates

4. ✅ **Deploy** (Optional)
   - See [Deployment Guide](docs/DEPLOYMENT.md)
   - Try Render, Railway, or Heroku

---

## 🆘 Getting Help

If you're stuck:

1. **Check logs** in terminal where `python run.py` is running
2. **Check browser console** (F12) for JavaScript errors
3. **Search issues** on GitHub
4. **Ask for help** in Discussions

---

## ✅ Setup Complete!

You should now have:
- ✅ MedGuardian running locally
- ✅ Database initialized
- ✅ Test account created
- ✅ Rem reminder working

**Enjoy using MedGuardian!** 💊
