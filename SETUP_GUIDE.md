# MedGuardian Setup Guide

Complete guide for setting up and configuring MedGuardian for production use.

## Quick Start

1. **Install Dependencies**
   ```powershell
   cd C:\Users\Adithyakrishnan\Desktop\Medguardian
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```powershell
   # Copy example env file
   copy .env.example .env
   # Edit .env and set your SECRET_KEY
   ```

3. **Initialize Database**
   ```powershell
   python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
   ```

4. **Run Application**
   ```powershell
   python run.py
   ```

---

## Environment Configuration

### Required Variables

Edit `.env` and configure these essential variables:

```env
# Security (REQUIRED)
SECRET_KEY=your-very-secret-random-key-here

# Database
DATABASE_URL=sqlite:///instance/medguardian.db

# Flask Environment
FLASK_ENV=development
FLASK_DEBUG=True
```

### Generating a SECRET_KEY

```python
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and set it as your `SECRET_KEY` in `.env`.

---

## Tesseract OCR Setup

Tesseract is required for the OCR medication verification feature.

### Automated Installation (Windows)

```powershell
python setup_tesseract.py
```

The script will:
1. Download the Tesseract installer
2. Guide you through installation
3. Verify the setup

### Manual Installation

#### Windows
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer (`tesseract-ocr-w64-setup-X.X.X.exe`)
3. Install to: `C:\Program Files\Tesseract-OCR`
4. Add to PATH:
   - Open "Environment Variables"
   - Edit "Path" in System variables
   - Add: `C:\Program Files\Tesseract-OCR`
5. Restart your terminal/IDE

#### macOS
```bash
brew install tesseract
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

### Verification

```powershell
tesseract --version
```

You should see version 5.x or higher.

### Troubleshooting

**Error: "tesseract is not recognized"**
- Tesseract is not in your PATH
- Add `C:\Program Files\Tesseract-OCR` to PATH
- Restart terminal/IDE

**pytesseract.TesseractNotFoundError**
- Set in `.env`:
  ```env
  TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
  ```

---

## Email SMTP Configuration

Email notifications are optional but recommended for missed dose alerts.

### Automated Setup

```powershell
python setup_email.py
```

The wizard will:
1. Guide you through provider selection
2. Help you create app passwords
3. Test the connection
4. Save configuration to `.env`

### Manual Configuration

Edit `.env`:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your.email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=your.email@gmail.com
```

### Provider-Specific Setup

#### Gmail

1. Enable 2-Factor Authentication
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Custom name)"
4. Name it "MedGuardian"
5. Copy the 16-character password
6. Use this as `MAIL_PASSWORD` in `.env`

#### Outlook/Hotmail

```env
MAIL_SERVER=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USE_TLS=True
```

You can use your regular password or create an app password.

#### Yahoo

```env
MAIL_SERVER=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_USE_TLS=True
```

Requires app password from account security settings.

---

## Database Setup

### Initial Migration

```powershell
python add_sample_data.py
```

This creates test users and sample medications.

### Database Schema Updates

If you've added verification columns:

```powershell
python migrate_verification_columns.py
```

---

## Common Issues & Solutions

### Issue: CSRF Token Missing

**Error:** "The CSRF token is missing"

**Solution:**
```powershell
python fix_csrf_tokens.py
```

### Issue: Camera Not Working

**Solutions:**
1. Check camera permissions in Windows Settings
2. Close other applications using the camera
3. Try a different browser
4. Check browser permissions for camera access

### Issue: Barcode Not Scanning

**Solutions:**
1. Ensure good lighting
2. Hold barcode steady
3. Make sure barcode is in focus
4. Barcodes must be saved to medications first

---

## Performance Optimization

### Add Database Indexes

```powershell
python add_indexes.py
```

### Enable Production Mode

In `.env`:
```env
FLASK_ENV=production
FLASK_DEBUG=False
SESSION_COOKIE_SECURE=True
```

---

## Security Checklist

- [ ] Set a strong `SECRET_KEY` (not the default)
- [ ] Enable CSRF protection (`WTF_CSRF_ENABLED=True`)
- [ ] Set `SESSION_COOKIE_SECURE=True` if using HTTPS
- [ ] Don't commit `.env` to version control
- [ ] Use app passwords for email, not your main password
- [ ] Enable rate limiting (`RATELIMIT_ENABLED=True`)
- [ ] Review and change default user passwords

---

## Next Steps

1. **Test All Features**
   - Login as testsenior
   - Add a medication
   - Save a reference image
   - Test camera verification
   - Check interaction checker

2. **Create Real Users**
   - Delete test users
   - Create actual user accounts
   - Assign caregivers to seniors

3. **Configure Notifications**
   - Test email delivery
   - Adjust missed dose check interval

---

**MedGuardian is now ready to use! 🎉**
