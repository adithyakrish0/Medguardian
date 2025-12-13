# MedGuardian User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Medications](#managing-medications)
4. [Medication Reminders](#medication-reminders)
5. [Voice Commands](#voice-commands)
6. [Camera Verification](#camera-verification)
7. [Caregiver Features](#caregiver-features)
8. [Emergency SOS](#emergency-sos)
9. [Analytics & Reports](#analytics--reports)
10. [Settings](#settings)

## Getting Started

### First Login

1. Navigate to http://localhost:5001
2. Click "Register" to create an account
3. Choose account type:
   - **Senior**: For elderly users taking medications
   - **Caregiver**: For family members/nurses monitoring seniors
4. Complete profile information

### Dashboard Tour

After logging in, you'll see:
- **Next Medication**: Countdown to next dose
- **Today's Progress**: Medications taken vs missed
- **Upcoming Schedule**: List of medications for today
- **Quick Actions**: Add medication, view history, SOS button

## Managing Medications

### Adding a Medication

1. Click "+ Add Medication" on dashboard
2. Fill in details:
   - **Name**: Medication name (e.g., "Aspirin")
   - **Dosage**: Amount (e.g., "100mg")
   - **Frequency**: When to take (Morning/Afternoon/Evening/Night)
   - **Custom Times**: Specific times (e.g., "08:30", "20:00")
   - **Instructions**: Special notes ("Take with food")
   - **Start/End Date**: Duration of medication
   - **Priority**: High/Medium/Low for importance

3. **Optional**: Take reference photo
   - Helps with camera verification
   - Point camera at medication bottle/strip
   - Take clear, well-lit photo

4. Click "Save Medication"

### Editing Medications

1. Go to "My Medications" page
2. Find medication in list
3. Click "Edit" button
4. Update details
5. Click "Save Changes"

### Deleting Medications

1. Go to "My Medications" page
2. Click "Delete" on medication card
3. Confirm deletion

## Medication Reminders

### How Reminders Work

- System checks every 10 seconds for due medications
- Alert triggers when:
  - Within 5 minutes before scheduled time
  - Up to 5 minutes after scheduled time

### Reminder Page

When a medication is due:
1. **Automatic Redirect**: Page redirects to reminder screen
2. **Alarm Sound**: Plays until acknowledged
3. **Camera View**: Live feed for verification (if enabled)
4. **AI Detection**: Automatically detects medication in view

### Actions on Reminder Page

**"I've Taken It"** button:
- Marks medication as taken
- Stops alarm
- Returns to dashboard
- Records in history with timestamp

**"Snooze (5m)"** button:
- Delays reminder by 5 minutes
- Useful if you need a moment
- Stops alarm temporarily

**"Remind Later (15m)"** button:
- Longer delay (15 minutes)
- For when you're busy
- Alarm will come back

**"Skip This Dose"** button:
- Records dose as skipped/missed
- Stops reminders for this specific dose
- Useful if you can't take medication

### Inactivity Timeout

If you don't respond for 10 minutes:
- Shows warning at 9 minutes
- Auto-skips at 10 minutes
- Prevents page hanging indefinitely

## Voice Commands

### Enabling Voice Control

1. Click microphone icon in header
2. Allow microphone access
3. Say "Hey MedGuardian" to activate

### Supported Commands

#### Navigation
- "Go to dashboard"
- "Show my medications"
- "Open analytics"
- "Add medication"

#### Medication Actions
- "Mark medication taken"
- "Snooze reminder"
- "Skip this dose"

#### Information
- "What's next" - Shows next medication
- "Today's schedule" - Lists all medications today
- "Medication count" - How many medications you have

### Voice Feedback

- System speaks confirmation
- Visual indicator shows listening status
- Commands logged in console for debugging

## Camera Verification

### Setup

1. Grant camera permission when prompted
2. Position camera to see medication area
3. Ensure good lighting

### How It Works

**AI Detection**:
- YOLO model detects objects in frame
- Green boxes around detected items
- Confidence percentage shown

**Verification Methods**:
1. **AI Training**: Compares with reference photo
2. **Visual Similarity**: Checks pattern matching
3. **Barcode**: Scans medication codes (if visible)
4. **OCR**: Reads text on labels

### Tips for Better Detection

- Good lighting (avoid shadows)
- Stable camera position
- Clear view of medication
- Hold bottle/strip steady
- Reference photo helps accuracy

## Caregiver Features

### Setting Up Caregiver Account

1. Register as "Caregiver" role
2. Link to senior account:
   - Navigate to "My Seniors"
   - Click "Add Senior"
   - Enter senior's username
   - Select relationship type

### Monitoring Seniors

**Senior Dashboard**:
- View all linked seniors
- See medication compliance
- Check recent activity
- View missed doses

**Alerts**:
- Email notifications for missed doses
- Telegram alerts (if configured)
- Weekly summary reports

### Managing Senior's Medications

1. Click on senior's card
2. View their medication list
3. Add/edit medications for them
4. Review their history

## Emergency SOS

### Triggering SOS

**Voice Command**: "Emergency" or "Help"

**SOS Button** (Red button on dashboard):
1. Click SOS button
2. Confirm emergency
3. System sends alerts

### What Happens

1. **Email Alerts**: Sent to all emergency contacts
2. **Caregiver Notification**: All linked caregivers alerted
3. **Telegram Alert**: If bot is configured
4. **Timestamp**: Records exact time of SOS

### Emergency Contacts

**Adding Contacts**:
1. Go to "Emergency Contacts"
2. Click "Add Contact"
3. Fill in:
   - Name
   - Phone number
   - Email
   - Relationship

## Analytics & Reports

### Viewing Analytics

Navigate to "Analytics" to see:

**Compliance Chart**:
- Pie chart of taken vs missed
- Weekly/monthly trends
- Compliance percentage

**Medication History**:
- Table of all doses
- Filters by date/medication
- Export to CSV/PDF

**Streak Counter**:
- Days without missing a dose
- Motivational tracker

### Exporting Data

1. Go to "Export" page
2. Select date range
3. Choose format (CSV/PDF)
4. Click "Download"

### Printing Schedule

1. Navigate to "Print Schedule"
2. Select timeframe
3. Choose medications
4. Click "Print"
5. Use browser print dialog

## Settings

### Dark Mode

Toggle in top-right corner:
- Automatic based on system
- Easier on eyes at night

### Accessibility

**Text Size**:
- Settings > Accessibility
- Choose Small/Medium/Large

**High Contrast**:
- Enable for better visibility
- Useful for vision impairments

### Notifications

**Email Alerts**:
- Configure in account settings
- Choose alert types

**Telegram**:
1. Search "@MedGuardianpy_bot" on Telegram
2. Send `/start`
3. Link account with code

### Account

**Change Password**:
1. Settings > Account
2. Enter current password
3. Enter new password twice
4. Save

**Profile Picture**:
- Click avatar in header
- Upload new photo

## Troubleshooting

### Reminder Not Showing

1. Check medication is active (not ended)
2. Verify correct time slots selected
3. Refresh dashboard page
4. Check browser console for errors

### Camera Not Working

1. Grant camera permission
2. Check no other app is using camera
3. Try different browser
4. Restart browser

### Voice Commands Not Working

1. Grant microphone permission
2. Speak clearly and slowly
3. Check microphone is not muted
4. Try in quieter environment

### Not Receiving Emails

1. Check spam/junk folder
2. Verify email in profile settings
3. Contact administrator

## Tips & Best Practices

1. **Regular Updates**: Keep medication list current
2. **Reference Photos**: Add photos for better verification
3. **Test SOS**: Ensure emergency contacts work
4. **Check Dashboard Daily**: Review upcoming medications
5. **Use Voice Commands**: Hands-free when busy
6. **Link Caregiver**: Have someone monitor your compliance
7. **Regular  Check-ins**: Review analytics weekly

## Support

Need help? Check in this order:
1. This User Guide
2. SETUP_GUIDE.md (technical setup)
3. DEPLOYMENT.md (server administrators)
4. Contact your system administrator
