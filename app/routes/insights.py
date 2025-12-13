# app/routes/insights.py
"""
AI Health Insights routes
Uses Gemini to analyze medication adherence and provide personalized insights
"""
from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user
from datetime import datetime, timedelta

insights = Blueprint('insights', __name__)

@insights.route('/')
@login_required
def dashboard():
    """AI Insights dashboard"""
    return render_template('insights/dashboard.html')

@insights.route('/generate', methods=['POST'])
@login_required
def generate():
    """Generate AI health insights"""
    try:
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        
        # Gather user's medication data
        medications = Medication.query.filter_by(user_id=current_user.id).all()
        
        if not medications:
            return jsonify({
                'success': False,
                'error': 'No medications found. Add medications first to get insights.'
            })
        
        # Get last 30 days of logs
        thirty_days_ago = datetime.now() - timedelta(days=30)
        logs = MedicationLog.query.filter(
            MedicationLog.user_id == current_user.id,
            MedicationLog.taken_at >= thirty_days_ago
        ).all()
        
        # Prepare compliance data
        compliance_data = {
            'total_medications': len(medications),
            'total_logs': len(logs),
            'taken_correctly': sum(1 for log in logs if log.taken_correctly),
            'missed': sum(1 for log in logs if not log.taken_correctly),
            'days_analyzed': 30,
            'morning_doses': sum(1 for log in logs if log.taken_at.hour < 12),
            'afternoon_doses': sum(1 for log in logs if 12 <= log.taken_at.hour < 17),
            'evening_doses': sum(1 for log in logs if 17 <= log.taken_at.hour < 21),
            'night_doses': sum(1 for log in logs if log.taken_at.hour >= 21),
            'compliance_rate': round(sum(1 for log in logs if log.taken_correctly) / len(logs) * 100) if logs else 0,
            'weekly_pattern': get_weekly_pattern(logs),
            'daily_pattern': get_daily_pattern(logs),
        }
        
        med_data = [{
            'name': m.name,
            'dosage': m.dosage,
            'morning': m.morning,
            'afternoon': m.afternoon,
            'evening': m.evening,
            'night': m.night
        } for m in medications]
        
        # Generate insights with Gemini
        from app.services.gemini_service import gemini_service
        
        if not gemini_service.is_configured():
            # Fallback to basic insights if Gemini not available
            return jsonify({
                'success': True,
                'data': generate_basic_insights(compliance_data, med_data)
            })
        
        result = gemini_service.generate_health_insights(compliance_data, med_data)
        
        if result['success']:
            return jsonify(result)
        else:
            # Fallback to basic insights
            return jsonify({
                'success': True,
                'data': generate_basic_insights(compliance_data, med_data)
            })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


def get_weekly_pattern(logs):
    """Get compliance by day of week"""
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    pattern = {day: {'taken': 0, 'missed': 0} for day in days}
    
    for log in logs:
        day = days[log.taken_at.weekday()]
        if log.taken_correctly:
            pattern[day]['taken'] += 1
        else:
            pattern[day]['missed'] += 1
    
    return pattern


def get_daily_pattern(logs):
    """Get compliance by time of day"""
    pattern = {
        'morning': {'taken': 0, 'missed': 0},
        'afternoon': {'taken': 0, 'missed': 0},
        'evening': {'taken': 0, 'missed': 0},
        'night': {'taken': 0, 'missed': 0}
    }
    
    for log in logs:
        hour = log.taken_at.hour
        if hour < 12:
            period = 'morning'
        elif hour < 17:
            period = 'afternoon'
        elif hour < 21:
            period = 'evening'
        else:
            period = 'night'
        
        if log.taken_correctly:
            pattern[period]['taken'] += 1
        else:
            pattern[period]['missed'] += 1
    
    return pattern


def generate_basic_insights(compliance_data, medications):
    """Generate basic insights without AI"""
    insights = []
    
    # Compliance rate insight
    rate = compliance_data['compliance_rate']
    if rate >= 90:
        insights.append({
            'type': 'positive',
            'icon': '🏆',
            'title': 'Excellent Compliance!',
            'message': f'Your {rate}% compliance rate is outstanding. Keep up the great work!'
        })
    elif rate >= 70:
        insights.append({
            'type': 'warning',
            'icon': '👍',
            'title': 'Good Progress',
            'message': f'Your {rate}% compliance is good, but there\'s room for improvement.'
        })
    else:
        insights.append({
            'type': 'suggestion',
            'icon': '⚠️',
            'title': 'Needs Attention',
            'message': f'Your {rate}% compliance needs improvement. Consider setting more reminders.'
        })
    
    # Time pattern insight
    daily = compliance_data['daily_pattern']
    best_time = max(daily.items(), key=lambda x: x[1]['taken'])[0]
    worst_time = min(daily.items(), key=lambda x: x[1]['taken'] - x[1]['missed'])[0]
    
    insights.append({
        'type': 'positive',
        'icon': '⏰',
        'title': f'Best Time: {best_time.title()}',
        'message': f'You take medications most consistently during {best_time} hours.'
    })
    
    if worst_time != best_time:
        insights.append({
            'type': 'suggestion',
            'icon': '💡',
            'title': f'Improve {worst_time.title()} Doses',
            'message': f'Consider setting extra reminders for your {worst_time} medications.'
        })
    
    # Medication count insight
    med_count = len(medications)
    insights.append({
        'type': 'positive',
        'icon': '💊',
        'title': f'Managing {med_count} Medication(s)',
        'message': 'Stay consistent with your routine for best health outcomes.'
    })
    
    return {
        'overall_score': 'A' if rate >= 90 else ('B' if rate >= 70 else 'C'),
        'summary': f'Based on 30 days of data with {rate}% compliance.',
        'insights': insights,
        'tips': [
            'Take medications at the same time every day',
            'Use Telegram notifications for instant reminders',
            'Keep medications visible as a visual reminder'
        ]
    }
