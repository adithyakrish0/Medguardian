# MedGuardian Deployment Guide

## Prerequisites

- Python 3.10 or higher
- pip package manager
- Tesseract OCR (for prescription scanning)
- SQLite (included) or PostgreSQL (production)
- Redis (optional, for production features)

## Quick Start (Development)

### 1. Clone and Setup

```bash
# Clone the repository
cd MedGuardian

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
# REQUIRED:
# - SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_hex(32))")
# - GEMINI_API_KEY (get from Google AI Studio)
# - TELEGRAM_BOT_TOKEN (optional, for notifications)

# OPTIONAL (for advanced features):
# - MAIL_USERNAME and MAIL_PASSWORD
# - DATABASE_URL (defaults to SQLite)
```

### 3. Database Initialization

```bash
# Initialize database
flask db upgrade

# Seed test data (optional)
python run.py seed_db
```

### 4. Run Application

```bash
# Development server
python run.py

# Access at: http://localhost:5001
```

## Production Deployment

### Environment Variables

```bash
# Production settings
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=<strong-random-key>
DATABASE_URL=postgresql://user:pass@localhost/medguardian
REDIS_URL=redis://localhost:6379/0

# Security
SESSION_COOKIE_SECURE=True  # Requires HTTPS
WTF_CSRF_ENABLED=True

# Email (required for production)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Using Docker

```bash
# Build image
docker-compose build

# Run services
docker-compose up -d

# Initialize database
docker-compose exec web flask db upgrade
```

### Manual Deployment (Linux)

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install python3-pip python3-venv tesseract-ocr redis-server postgresql

# Setup application
cd /var/www/medguardian
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure PostgreSQL
sudo -u postgres createuser medguard
sudo -u postgres createdb medguardian
sudo -u postgres psql -c "ALTER USER medguard WITH PASSWORD 'yourpassword';"

# Use production server (Gunicorn)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 wsgi:app
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name medguardian.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static {
        alias /var/www/medguardian/app/static;
    }
}
```

## Post-Deployment Checklist

- [] Database initialized and migrated
- [ ] Environment variables configured
- [ ] HTTPS enabled with SSL certificate
- [ ] Email service configured and tested
- [ ] Backup strategy implemented
- [ ] Monitoring and logging configured
- [ ] Rate limiting verified
- [ ] CSRF protection enabled
- [ ] Test user account created
- [ ] Telegram bot configured (if using)

## Troubleshooting

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
rm instance/medguardian.db
flask db upgrade

# Check database tables
python scripts/maintenance/check_tables.py
```

### Camera/Vision Issues

```bash
# Test camera
python -c "import cv2; print(cv2.VideoCapture(0).isOpened())"

# Download YOLO model manually
wget https://github.com/ultralytics/yolov5/releases/download/v6.0/yolov5s.pt
```

### Email Not Sending

1. Check Gmail App Password (not regular password)
2. Verify MAIL settings in .env
3. Check firewall/port 587 access

### Scheduler Not Running

```bash
# Check logs
tail -f app.log

# Verify SCHEDULER_ENABLED=True in .env
```

## Backup & Restore

### Backup

```bash
# SQLite
cp instance/medguardian.db backups/medguardian_$(date +%Y%m%d).db

# PostgreSQL
pg_dump medguardian > backups/medguardian_$(date +%Y%m%d).sql
```

### Restore

```bash
# SQLite
cp backups/medguardian_20250101.db instance/medguardian.db

# PostgreSQL
psql medguard Guardian < backups/medguardian_20250101.sql
```

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_medication_user ON medication(user_id);
CREATE INDEX idx_medication_log_user ON medication_log(user_id, taken_at);
CREATE INDEX idx_snooze_log_user ON snooze_log(user_id, snooze_until);
```

### Redis Caching

```python
# Enable Redis in .env
REDIS_URL=redis://localhost:6379/0
RATELIMIT_STORAGE_URL=redis://localhost:6379/1
SOCKETIO_MESSAGE_QUEUE=redis://localhost:6379/2
```

## Security Best Practices

1. **Never commit .env file** - already in .gitignore
2. **Use strong SECRET_KEY** - 32+ random bytes
3. **Enable HTTPS in production** - SESSION_COOKIE_SECURE=True
4. **Regular updates** - pip install -U -r requirements.txt
5. **Database backups** - automated daily backups
6. **Monitor logs** - watch for suspicious activity
7. **Rate limiting** - prevent brute force attacks

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:5001/health
```

### Log Files

- Application: `app.log`
- Scheduler: Check terminal output for `[BACKEND | Scheduler]`
- Nginx: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

## Support

For issues or questions:
1. Check this deployment guide
2. Review `SETUP_GUIDE.md` for initial setup
3. Check `README.md` for feature documentation
4. Search existing issues on GitHub
