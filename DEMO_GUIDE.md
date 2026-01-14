# MedGuardian Demo Setup

## Quick Start (Windows)

### Option 1: One-Click Demo
Double-click `start_demo.bat` - it will:
1. Start the Flask server
2. Create a Cloudflare tunnel
3. Show you the public URL to share

### Option 2: Manual Setup

**Terminal 1 - Start Server:**
```bash
python run.py
```

**Terminal 2 - Start Tunnel:**
```bash
cloudflared tunnel --url http://localhost:5000
```

---

## Demo Scenario: Remote Camera

### Setup (requires 2 accounts)

**Account 1 - Senior:**
- Username: `senior1`
- Password: `123456`

**Account 2 - Caregiver:**
- Username: `caregiver1`
- Password: `123456`

### Steps:

1. **Create accounts** (if not exists):
   - Open tunnel URL → Register as Senior (senior1)
   - Open tunnel URL → Register as Caregiver (caregiver1)

2. **Link accounts:**
   - Login as caregiver
   - Go to "Add Senior" → Enter senior1's username

3. **Test Camera:**
   - **Your laptop:** Login as senior1
   - **Friend's laptop:** Login as caregiver1
   - **Friend:** Dashboard → Click senior1 → "View Camera"
   - **You:** Accept the camera request
   - **Friend:** Sees your camera feed!

---

## Troubleshooting

### Camera not working?
- Requires HTTPS (use cloudflared, not localhost)
- Allow camera permissions in browser
- Check console for errors (F12)

### Socket not connecting?
- Make sure both are on the same tunnel URL
- Clear browser cache and refresh
- Check if server shows "SocketIO connected" logs

### Friend can't access?
- Share the FULL cloudflared URL (https://xxx.trycloudflare.com)
- URL changes each time you restart cloudflared

---

## Quick Commands

```bash
# Install cloudflared (if not installed)
winget install Cloudflare.cloudflared

# Start everything
start_demo.bat

# Or manually:
python run.py
# (new terminal)
cloudflared tunnel --url http://localhost:5000
```
