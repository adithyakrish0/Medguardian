import re

def fix_main_py():
    file_path = 'app/routes/main.py'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    in_dashboard = False
    skip_block = False
    
    # We want to remove the 'else:' block after active_snooze and the redirect logic
    # And ensure the upcoming medications logic is properly indented
    
    iterator = iter(lines)
    for line in iterator:
        # Detect start of dashboard function to be safe
        if 'def dashboard():' in line:
            in_dashboard = True
            new_lines.append(line)
            continue
            
        if not in_dashboard:
            new_lines.append(line)
            continue
            
        # Look for the if active_snooze block end
        # We want to keep the if active_snooze block, but remove the else: that follows
        
        if 'if active_snooze:' in line:
            new_lines.append(line)
            # Process the if block normally
            continue
            
        # Detect the specific else block we want to remove (the one with redirect logic)
        if line.strip() == 'else:' and 'Check if any medication is due now' in next((x for x in lines[lines.index(line):] if x.strip()), ''):
            # We found the else block. We want to skip the redirect logic inside it.
            # The redirect logic ends before "# Collect all next doses"
            skip_block = True
            continue
            
        if skip_block:
            # We are skipping the redirect logic.
            # We stop skipping when we see "# Collect all next doses"
            if '# Collect all next doses' in line:
                skip_block = False
                # Now we need to add the collection logic, but unindented
                # The original code had it indented under else (12 spaces likely)
                # We want it at the same level as if active_snooze (8 spaces)
                
                # Let's just append this line with corrected indentation (8 spaces)
                new_lines.append('        # Collect all next doses from all medications\n')
                
                # Now we need to process subsequent lines until we hit "return render_template"
                # and unindent them.
                # However, it's safer to just write the correct logic here and skip the old lines
                # until we match the end of that section.
                
                # Actually, let's just read until we hit "return render_template" and replace the whole chunk
                # This is safer than line-by-line adjustment given the mess.
                pass
            else:
                continue

        # If we are not skipping, just append
        new_lines.append(line)

    # This approach is a bit fragile with iterators. 
    # Let's try a block replacement approach which is more robust.
    
    content = "".join(lines)
    
    # Pattern to find the if active_snooze block and the following else block
    # We want to capture everything from "if active_snooze:" up to "return render_template"
    # and replace it with the corrected logic.
    
    start_marker = "        # Check for active snooze"
    end_marker = "return render_template('senior/dashboard.html',"
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        print("Could not find start or end markers")
        return

    # Keep the start marker
    prefix = content[:start_idx]
    suffix = content[end_idx:]
    
    # The new logic to insert
    new_logic = '''        # Check for active snooze
        now = datetime.utcnow()
        active_snooze = SnoozeLog.query.filter(
            SnoozeLog.user_id == current_user.id,
            SnoozeLog.snooze_until > now
        ).order_by(SnoozeLog.created_at.desc()).first()
            
        # Calculate statistics
        upcoming_count = len([m for m in medications if any([m.morning, m.afternoon, m.evening, m.night, m.custom_reminder_times])])
        today_count = len(medications)
            
        # Calculate compliance
        total_logs = MedicationLog.query.filter_by(user_id=current_user.id).all()
        taken_logs = [log for log in total_logs if log.taken_correctly]
        compliance_rate = int((len(taken_logs) / len(total_logs) * 100)) if total_logs else 0
            
        # Get today's medications with status
        today_medications = []
        for med in medications:
            taken = any(log.medication_id == med.id and log.taken_at.date() == today and log.taken_correctly 
                       for log in today_logs)
                
            # Parse scheduled times for display
            scheduled_times = []
            if med.custom_reminder_times:
                try:
                    custom_times = json.loads(med.custom_reminder_times)
                    scheduled_times.extend([{'time': t, 'period': 'Custom'} for t in custom_times])
                except:
                    pass
                
            # Add period-based times
            periods = []
            if med.morning: periods.append('Morning')
            if med.afternoon: periods.append('Afternoon')
            if med.evening: periods.append('Evening')
            if med.night: periods.append('Night')
                
            for period in periods:
                scheduled_times.append({
                    'time': period + ' (' + get_period_time_range(period) + ')',
                    'period': period
                })
                
            today_medications.append({
                'id': med.id,
                'name': med.name,
                'dosage': med.dosage,
                'frequency': med.frequency,
                'taken': taken,
                'scheduled_times': scheduled_times if scheduled_times else [{'time': 'Not scheduled', 'period': 'Unknown'}]
            })
            
        # Get upcoming medications with proper timing
        now = datetime.now()
        upcoming_medications = []
            
        # If there's an active snooze, add it to upcoming
        if active_snooze:
            snooze_info = {
                'name': active_snooze.medication.name if active_snooze.medication else 'Medication',
                'dosage': active_snooze.medication.dosage if active_snooze.medication else 'Unknown dosage',
                'time': active_snooze.snooze_until,
                'period': 'Snooze',
                'is_custom': False,
                'is_snooze': True,
                'snooze_until': active_snooze.snooze_until.isoformat()
            }
            upcoming_medications.append(snooze_info)

        # ALWAYS collect next doses (no else block)
        all_doses = []
        for med in medications:
            next_dose = getNextMedicationTime(med, now)
            if next_dose:
                all_doses.append({
                    'id': med.id,
                    'name': med.name,
                    'dosage': med.dosage,
                    'time': next_dose['time'],
                    'period': next_dose['period'],
                    'is_custom': next_dose.get('is_custom', False)
                })
            
        # Sort all doses by actual datetime and take the first 6
        all_doses.sort(key=lambda x: x['time'])
        
        # Add to upcoming_medications (avoiding duplicates if snooze is already there is tricky, 
        # but for now let's just show both or rely on the fact that snooze is distinct)
        # Actually, if we have a snooze, we might want to filter that med out of normal schedule?
        # For simplicity, let's just append.
        upcoming_medications.extend(all_doses[:6])
            
        # Format times for display after sorting
        for med in upcoming_medications:
            if isinstance(med['time'], datetime):
                med['time'] = format_time_for_display(med['time'])
            
        # Count taken and missed
        taken_count = len([log for log in total_logs if log.taken_correctly])
        missed_count = len([log for log in total_logs if not log.taken_correctly])
            
        '''
    
    # We need to be careful about matching the exact indentation of the surrounding code
    # The previous code ended with `        return render_template...` (8 spaces)
    # My new_logic uses 8 spaces indentation.
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(prefix + new_logic + suffix)
    
    print("Successfully fixed main.py indentation and logic")

if __name__ == '__main__':
    fix_main_py()
