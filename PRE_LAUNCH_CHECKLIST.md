# MedGuardian - Pre-Launch Checklist

## Environment Setup

### Required Environment Variables
- [ ] `SECRET_KEY` - Strong random key (32+ bytes)
- [ ] `GEMINI_API_KEY` - Google AI Studio API key
- [ ] `DATABASE_URL` - Production database (PostgreSQL recommended)
- [ ] `MAIL_USERNAME` - Email account for sending notifications
- [ ] `MAIL_PASSWORD` - Email app password (not regular password)
- [ ] `TELEGRAM_BOT_TOKEN` - Telegram bot token (optional but recommended)

### Optional But Recommended
- [ ] `REDIS_URL` - For better performance and scalability
- [ ] `RATELIMIT_STORAGE_URL` - Redis URL for rate limiting
- [ ] `TESSERACT_CMD` - Path to Tesseract if not in system PATH

## Security Checklist

- [ ] `.env` file NOT committed to Git (verify `.gitignore`)
- [ ] All sensitive data in environment variables
- [ ] CSRF protection enabled (`WTF_CSRF_ENABLED=True`)
- [ ] HTTPS enabled in production (`SESSION_COOKIE_SECURE=True`)
- [ ] Strong `SECRET_KEY` generated
- [ ] Rate limiting enabled and tested
- [ ] SQL injection prevention verified (using parameterized queries)
- [ ] File upload restrictions in place (size limits, type validation)
- [ ] All routes properly authenticated with `@login_required`

## Database

- [ ] Database created and accessible
- [ ] Migrations run (`flask db upgrade`)
- [ ] Performance indexes added (`python scripts/maintenance/add_indexes.py`)
- [ ] Backup strategy implemented
- [ ] Connection pooling configured (production)

## Email Configuration

- [ ] SMTP server credentials configured
- [ ] Test email sent successfully
- [ ] Gmail App Password created (if using Gmail)
- [ ] Firewall allows SMTP port (usually 587)

## External Services

### Telegram (Optional)
- [ ] Bot created via @BotFather
- [ ] Bot token added to `.env`
- [ ] Bot tested with `/start` command

### Google Gemini AI
- [ ] API key obtained from Google AI Studio
- [ ] API key added to `.env`
- [ ] Drug interaction checker tested

## Application Features

### Core Functionality
- [ ] User registration and login working
- [ ] Dashboard loads correctly
- [ ] Medication CRUD operations functional
- [ ] Reminders trigger at correct times
- [ ] Snooze functionality working (no loops!)
- [ ] Skip dose feature working
- [ ] Mark as taken feature working

### Camera & Vision
- [ ] Camera permission requested
- [ ] Camera feed displays correctly
- [ ] AI detection working (if YOLO model available)
- [ ] Reference image upload working
- [ ] Verification methods functional

### Notifications
- [ ] Email notifications sending
- [ ] Telegram notifications sending (if configured)
- [ ] Missed dose alerts working
- [ ] Emergency SOS alerts working

### Caregiver Features
- [ ] Caregiver account creation
- [ ] Senior linking functionality
- [ ] Caregiver dashboard showing senior data
- [ ] Caregiver alerts sending

### Analytics & Reports
- [ ] Compliance charts displaying
- [ ] History table loading
- [ ] CSV export working
- [ ] PDF export working
- [ ] Print schedule functional

### Voice Commands
- [ ] Microphone permission requested
- [ ] Voice recognition working
- [ ] Commands executing correctly
- [ ] Voice feedback playing

## Performance

- [ ] Page load times < 2 seconds
- [ ] Database queries optimized
- [ ] Indexes added to frequently queried columns
- [ ] Static files cached (production)
- [ ] Image compression for uploads

## Testing

### Manual Testing
- [ ] Complete medication reminder flow (add → reminder → take/snooze/skip)
- [ ] Snooze countdown and re-trigger
- [ ] Inactivity timeout (10 minutes)
- [ ] Emergency SOS flow
- [ ] Voice commands for common actions
- [ ] Dark mode toggle
- [ ] Accessibility features (text size, high contrast)
- [ ] Mobile responsiveness

### Edge Cases
- [ ] No medications added (dashboard should handle gracefully)
- [ ] Expired medications not showing reminders
- [ ] Multiple medications due at same time
- [ ] Network disconnection handling
- [ ] Long medication names and dosages
- [ ] Special characters in medication names

## Production Environment

- [ ] Production config loaded (`FLASK_ENV=production`)
- [ ] Debug mode OFF (`FLASK_DEBUG=False`)
- [ ] Proper logging configured (file rotation enabled)
- [ ] Error pages customized (404, 500)
- [ ] Health check endpoint accessible (`/health`, `/ping`)
- [ ] Gunicorn or similar WSGI server configured
- [ ] Nginx/Apache reverse proxy configured (if applicable)
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Monitoring/alerting set up

## Deployment

- [ ] Code pushed to Git repository
- [ ] `.env` file created on server (NOT in repo)
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Database initialized on server
- [ ] Static files collected (if using Flask-Assets)
- [ ] Systemd service created (for auto-restart)
- [ ] Log rotation configured
- [ ] Backup automation set up

## Documentation

- [ ] `README.md` updated with project description
- [ ] `SETUP_GUIDE.md` has clear installation steps
- [ ] `DEPLOYMENT.md` has production deployment guide
- [ ] `USER_GUIDE.md` has feature documentation
- [ ] `API.md` has endpoint documentation
- [ ] Environment variables documented in `.env.example`
- [ ] Comments added to complex code
- [ ] Database schema documented

## Final Checks

- [ ] All console errors resolved
- [ ] No broken links on any page
- [ ] All images loading correctly
- [ ] Forms submitting correctly
- [ ] Redirects working as expected
- [ ] Session management working
- [ ] Logout functionality working
- [ ] Password reset working (if implemented)
- [ ] User profile update working

## Post-Launch

- [ ] Monitor logs for errors
- [ ] Check database growth rate
- [ ] Monitor API rate limits
- [ ] Review user feedback
- [ ] Plan feature updates
- [ ] Schedule regular backups
- [ ] Update documentation as needed

---

## Quick Test Script

Run these commands to verify core functionality:

```bash
# 1. Test database connection
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.session.execute('SELECT 1'); print('✅ Database OK')"

# 2. Test health endpoint
curl http://localhost:5001/health

# 3. Run basic imports
python -c "from app.models.auth import User; from app.models.medication import Medication; print('✅ Models OK')"

# 4. Check dependencies
pip check

# 5. Test email (requires manual verification)
python scripts/maintenance/test_email.py
```

## Notes

- Keep this checklist for future deployments
- Update as new features are added
- Use for both staging and production environments
- Tick off items as you verify them
