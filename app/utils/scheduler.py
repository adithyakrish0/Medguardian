"""
REMINDER SCHEDULER WITH FULL FORENSIC LOGGING
Every micro-event logged to terminal in real-time
"""
import sys
import time
import json
from datetime import datetime, timedelta
from app.extensions import db, socketio
from app.models.medication import Medication
from app.models.medication_log import MedicationLog
from app.models.snooze_log import SnoozeLog

def debug_log(module, function, status, data=""):
    """Print formatted debug log to terminal immediately"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    msg = f"[BACKEND | {module} | {function} | {timestamp} | {status} | {data}]"
    print(msg, flush=True)
    sys.stdout.flush()

def get_scheduled_times(medication, date):
    """
    Get all scheduled times for a medication on a given date
    Returns list of datetime objects
    """
    from datetime import datetime, time as dt_time
    
    scheduled_times = []
    
    # Check preset times
    preset_times = {
        'morning': dt_time(8, 0),
        'afternoon': dt_time(14, 0),
        'evening': dt_time(18, 0),
        'night': dt_time(21, 0)
    }
    
    if medication.morning:
        scheduled_times.append(datetime.combine(date, preset_times['morning']))
    if medication.afternoon:
        scheduled_times.append(datetime.combine(date, preset_times['afternoon']))
    if medication.evening:
        scheduled_times.append(datetime.combine(date, preset_times['evening']))
    if medication.night:
        scheduled_times.append(datetime.combine(date, preset_times['night']))
    
    # Custom times from JSON field
    if medication.custom_reminder_times:
        try:
            custom_times = json.loads(medication.custom_reminder_times)
            debug_log('Scheduler', 'get_scheduled_times', 'PARSING_CUSTOM', f"med={medication.id}, raw={custom_times}")
            for time_str in custom_times:
                if time_str and ':' in str(time_str):
                    try:
                        time_parts = str(time_str).strip().split(':')
                        hour = int(time_parts[0])
                        minute = int(time_parts[1])
                        scheduled_times.append(
                            datetime.combine(date, dt_time(hour, minute))
                        )
                    except (ValueError, IndexError) as e:
                        debug_log('Scheduler', 'get_scheduled_times', 'PARSE_ERROR', f"time={time_str}, err={e}")
        except (json.JSONDecodeError, TypeError) as e:
            debug_log('Scheduler', 'get_scheduled_times', 'JSON_ERROR', f"med={medication.id}, err={e}")
    
    return sorted(scheduled_times)


def send_realtime_reminders():
    """
    Check for medications due now and emit SocketIO events with FULL LOGGING
    """
    now = datetime.now()
    current_time = time.time()
    
    debug_log('Scheduler', 'send_realtime_reminders', 'TICK_START', f"now={now.strftime('%H:%M:%S')}")
    
    # Initialize cache if not exists
    if not hasattr(send_realtime_reminders, '_sent_cache'):
        send_realtime_reminders._sent_cache = {}
        debug_log('Scheduler', 'send_realtime_reminders', 'CACHE_INIT', 'Created new cache')
    
    try:
        # Get all active medications
        medications = Medication.query.filter(
            Medication.start_date <= now.date()
        ).filter(
            (Medication.end_date.is_(None)) | (Medication.end_date >= now.date())
        ).all()
        
        debug_log('Scheduler', 'send_realtime_reminders', 'MEDS_FOUND', f"count={len(medications)}")
        
        for med in medications:
            debug_log('Scheduler', 'send_realtime_reminders', 'PROCESSING_MED', f"id={med.id}, name={med.name}, user={med.user_id}")
            
            # Get scheduled times for today
            scheduled_times = get_scheduled_times(med, now.date())
            debug_log('Scheduler', 'send_realtime_reminders', 'SCHEDULED_TIMES', f"med={med.id}, times={[t.strftime('%H:%M') for t in scheduled_times]}")
            
            for scheduled_time in scheduled_times:
                # Calculate difference in minutes
                diff_seconds = (scheduled_time - now).total_seconds()
                diff_minutes = diff_seconds / 60
                
                debug_log('Scheduler', 'send_realtime_reminders', 'TIME_CHECK', 
                    f"med={med.id}, scheduled={scheduled_time.strftime('%H:%M:%S')}, now={now.strftime('%H:%M:%S')}, diff_min={diff_minutes:.2f}")
                
                    # Check if within window: past 5 mins to future 1 min (for polling-based redirect to work)
                if -5 <= diff_minutes <= 1:
                    debug_log('Scheduler', 'send_realtime_reminders', 'IN_WINDOW', f"med={med.id}, diff_min={diff_minutes:.2f}")
                    
                    # Check for active snooze first
                    active_snooze = SnoozeLog.query.filter(
                        SnoozeLog.medication_id == med.id,
                        SnoozeLog.user_id == med.user_id,
                        SnoozeLog.snooze_until > now  # Use local time consistently
                    ).first()

                    if active_snooze:
                        debug_log('Scheduler', 'send_realtime_reminders', 'SNOOZED', f"med={med.id}, until={active_snooze.snooze_until}")
                        continue
                    
                    # Check if already taken OR skipped today
                    today_start = datetime.combine(now.date(), datetime.min.time())
                    today_end = datetime.combine(now.date(), datetime.max.time())
                    
                    # Check for ANY log entry (taken or skipped) 
                    log = MedicationLog.query.filter_by(
                        medication_id=med.id,
                        user_id=med.user_id
                    ).filter(
                        MedicationLog.taken_at >= today_start,
                        MedicationLog.taken_at <= today_end
                    ).first()
                    
                    if log:
                        debug_log('Scheduler', 'send_realtime_reminders', 'ALREADY_TAKEN', f"med={med.id}, log_id={log.id}")
                        continue
                    
                    debug_log('Scheduler', 'send_realtime_reminders', 'NOT_TAKEN', f"med={med.id}, proceeding to emit")
                    
                    # Check duplication cache
                    cache_key = (med.id, scheduled_time.strftime("%H:%M"))
                    last_sent = send_realtime_reminders._sent_cache.get(cache_key)
                    
                    if last_sent and (current_time - last_sent) <= 300:
                        debug_log('Scheduler', 'send_realtime_reminders', 'CACHE_HIT', 
                            f"med={med.id}, last_sent={datetime.fromtimestamp(last_sent).strftime('%H:%M:%S')}, skipping")
                        continue
                    
                    debug_log('Scheduler', 'send_realtime_reminders', 'CACHE_MISS', f"med={med.id}, will emit")
                    
                    # Build reminder data
                    reminder_data = {
                        'medication_id': med.id,
                        'medication_name': med.name,
                        'dosage': med.dosage,
                        'scheduled_time': scheduled_time.isoformat(),
                        'scheduled_time_display': scheduled_time.strftime('%I:%M %p'),
                        'instructions': med.instructions,
                        'priority': med.priority
                    }
                    
                    room = f'user_{med.user_id}'
                    
                    debug_log('Scheduler', 'send_realtime_reminders', 'EMIT_ATTEMPT', 
                        f"room={room}, med={med.id}, data={json.dumps(reminder_data)}")
                    
                    # Emit to SocketIO
                    try:
                        socketio.emit(
                            'medication_reminder',
                            reminder_data,
                            room=room,
                            namespace='/'
                        )
                        debug_log('Scheduler', 'send_realtime_reminders', 'EMIT_SUCCESS', f"room={room}, med={med.id}")
                    except Exception as emit_err:
                        debug_log('Scheduler', 'send_realtime_reminders', 'EMIT_FAILED', f"error={str(emit_err)}")
                    
                    # Send Telegram notification if user has linked account
                    try:
                        from app.models.auth import User
                        from app.services.telegram_service import telegram_service
                        
                        user = User.query.get(med.user_id)
                        if user and user.telegram_chat_id:
                            telegram_service.send_medication_reminder(
                                chat_id=user.telegram_chat_id,
                                medication_name=med.name,
                                dosage=med.dosage,
                                time=scheduled_time.strftime('%I:%M %p'),
                                instructions=med.instructions
                            )
                            debug_log('Scheduler', 'send_realtime_reminders', 'TELEGRAM_SENT', f"user={med.user_id}, med={med.id}")
                        else:
                            debug_log('Scheduler', 'send_realtime_reminders', 'NO_TELEGRAM', f"user={med.user_id} has no telegram linked")
                    except Exception as tg_err:
                        debug_log('Scheduler', 'send_realtime_reminders', 'TELEGRAM_ERROR', f"error={str(tg_err)}")
                    
                    # Update cache
                    send_realtime_reminders._sent_cache[cache_key] = current_time
                    debug_log('Scheduler', 'send_realtime_reminders', 'CACHE_UPDATED', f"key={cache_key}")
                    
                else:
                    # Not in window
                    reason = "TOO_EARLY" if diff_minutes > 1 else "TOO_LATE" if diff_minutes < -5 else "UNKNOWN"
                    debug_log('Scheduler', 'send_realtime_reminders', 'OUTSIDE_WINDOW', 
                        f"med={med.id}, diff_min={diff_minutes:.2f}, reason={reason}")
        
        debug_log('Scheduler', 'send_realtime_reminders', 'TICK_END', f"completed at {datetime.now().strftime('%H:%M:%S')}")
        
    except Exception as e:
        debug_log('Scheduler', 'send_realtime_reminders', 'EXCEPTION', f"error={str(e)}")
        import traceback
        traceback.print_exc()


def check_missed_doses():
    """Check for missed medication doses and send alerts"""
    debug_log('Scheduler', 'check_missed_doses', 'START', f"now={datetime.now().strftime('%H:%M:%S')}")
    
    now = datetime.now()
    missed_threshold_minutes = 30  # Consider missed if 30 min past scheduled time
    
    # Cache to avoid duplicate alerts
    if not hasattr(check_missed_doses, '_alerted_cache'):
        check_missed_doses._alerted_cache = {}
    
    try:
        # Get all active medications
        medications = Medication.query.filter(
            Medication.start_date <= now.date()
        ).filter(
            (Medication.end_date.is_(None)) | (Medication.end_date >= now.date())
        ).all()
        
        debug_log('Scheduler', 'check_missed_doses', 'CHECKING', f"meds_count={len(medications)}")
        
        for med in medications:
            scheduled_times = get_scheduled_times(med, now.date())
            
            for scheduled_time in scheduled_times:
                diff_minutes = (now - scheduled_time).total_seconds() / 60
                
                # Check if missed (30+ minutes past due)
                if diff_minutes >= missed_threshold_minutes and diff_minutes <= 180:  # Within 3 hours
                    # Check if already taken
                    today_start = datetime.combine(now.date(), datetime.min.time())
                    today_end = datetime.combine(now.date(), datetime.max.time())
                    
                    log = MedicationLog.query.filter_by(
                        medication_id=med.id,
                        user_id=med.user_id,
                        taken_correctly=True
                    ).filter(
                        MedicationLog.taken_at >= today_start,
                        MedicationLog.taken_at <= today_end
                    ).first()
                    
                    if log:
                        continue  # Already taken, not missed
                    
                    # Check if already alerted
                    cache_key = (med.id, scheduled_time.strftime("%H:%M"), now.date().isoformat())
                    if cache_key in check_missed_doses._alerted_cache:
                        continue  # Already alerted
                    
                    debug_log('Scheduler', 'check_missed_doses', 'MISSED_DETECTED', 
                        f"med={med.id}, name={med.name}, scheduled={scheduled_time.strftime('%H:%M')}")
                    
                    # Send Telegram alert to user
                    try:
                        from app.models.auth import User
                        from app.services.telegram_service import telegram_service
                        
                        user = User.query.get(med.user_id)
                        if user and user.telegram_chat_id:
                            telegram_service.send_missed_dose_alert(
                                chat_id=user.telegram_chat_id,
                                medication_name=med.name,
                                scheduled_time=scheduled_time.strftime('%I:%M %p')
                            )
                            debug_log('Scheduler', 'check_missed_doses', 'USER_ALERT_SENT', f"user={med.user_id}")
                        
                        # Also alert caregivers if any
                        from app.models.relationship import CaregiverSenior
                        
                        relationships = CaregiverSenior.query.filter_by(senior_id=med.user_id).all()
                        for rel in relationships:
                            caregiver = User.query.get(rel.caregiver_id)
                            if caregiver and caregiver.telegram_chat_id:
                                telegram_service.send_missed_dose_alert(
                                    chat_id=caregiver.telegram_chat_id,
                                    medication_name=med.name,
                                    scheduled_time=scheduled_time.strftime('%I:%M %p'),
                                    senior_name=user.username if user else "Your senior"
                                )
                                debug_log('Scheduler', 'check_missed_doses', 'CAREGIVER_ALERT_SENT', 
                                    f"caregiver={rel.caregiver_id}")
                    
                    except Exception as tg_err:
                        debug_log('Scheduler', 'check_missed_doses', 'TELEGRAM_ERROR', f"error={str(tg_err)}")
                    
                    # Mark as alerted
                    check_missed_doses._alerted_cache[cache_key] = True
        
        debug_log('Scheduler', 'check_missed_doses', 'END', 'completed')
        
    except Exception as e:
        debug_log('Scheduler', 'check_missed_doses', 'EXCEPTION', f"error={str(e)}")
        import traceback
        traceback.print_exc()

