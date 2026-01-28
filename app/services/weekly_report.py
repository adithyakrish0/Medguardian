# app/services/weekly_report.py
"""
Caregiver Weekly Report Service
Sends automated weekly compliance reports to caregivers
"""
from datetime import datetime, timedelta
from flask import render_template_string

class WeeklyReportService:
    """Generate and send weekly reports to caregivers"""
    
    def __init__(self):
        pass
    
    def generate_report_data(self, senior_id):
        """Generate report data for a senior"""
        from app.models.medication import Medication
        from app.models.medication_log import MedicationLog
        from app.models.auth import User
        
        senior = User.query.get(senior_id)
        if not senior:
            return None
        
        # Get last 7 days of data
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        medications = Medication.query.filter_by(user_id=senior_id).all()
        logs = MedicationLog.query.filter(
            MedicationLog.user_id == senior_id,
            MedicationLog.taken_at >= datetime.combine(week_ago, datetime.min.time())
        ).all()
        
        # Calculate stats
        taken = sum(1 for log in logs if log.taken_correctly)
        missed = sum(1 for log in logs if not log.taken_correctly)
        total = taken + missed
        
        compliance_rate = int((taken / total * 100)) if total > 0 else 0
        
        # Daily breakdown
        daily_stats = {}
        for i in range(7):
            day = today - timedelta(days=i)
            day_logs = [log for log in logs if log.taken_at.date() == day]
            daily_stats[day.strftime('%a %d')] = {
                'taken': sum(1 for log in day_logs if log.taken_correctly),
                'missed': sum(1 for log in day_logs if not log.taken_correctly)
            }
        
        return {
            'senior_name': senior.username,
            'senior_email': senior.email,
            'report_date': datetime.now().strftime('%d %B %Y'),
            'period': f"{week_ago.strftime('%d %b')} - {today.strftime('%d %b %Y')}",
            'total_medications': len(medications),
            'doses_taken': taken,
            'doses_missed': missed,
            'compliance_rate': compliance_rate,
            'daily_stats': daily_stats,
            'medications': [{'name': m.name, 'dosage': m.dosage} for m in medications]
        }
    
    def generate_html_report(self, report_data):
        """Generate HTML email content"""
        template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                .header { background: #0B3954; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .stat-box { background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: center; }
                .stat-value { font-size: 32px; font-weight: bold; color: #0B3954; }
                .stat-label { color: #666; font-size: 14px; }
                .progress-bar { height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 15px 0; }
                .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
                th { background: #0B3954; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Weekly Report</h1>
                    <p>{{ data.senior_name }}'s Medication Compliance</p>
                    <p style="font-size: 12px; opacity: 0.8;">{{ data.period }}</p>
                </div>
                
                <div class="content">
                    <div style="display: flex; gap: 15px;">
                        <div class="stat-box" style="flex: 1;">
                            <div class="stat-value">{{ data.compliance_rate }}%</div>
                            <div class="stat-label">Compliance Rate</div>
                        </div>
                        <div class="stat-box" style="flex: 1;">
                            <div class="stat-value" style="color: #28a745;">{{ data.doses_taken }}</div>
                            <div class="stat-label">Doses Taken</div>
                        </div>
                        <div class="stat-box" style="flex: 1;">
                            <div class="stat-value" style="color: #dc3545;">{{ data.doses_missed }}</div>
                            <div class="stat-label">Doses Missed</div>
                        </div>
                    </div>
                    
                    <h3>📈 Compliance Progress</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {{ data.compliance_rate }}%;"></div>
                    </div>
                    
                    <h3>💊 Current Medications ({{ data.total_medications }})</h3>
                    <table>
                        <tr><th>Medication</th><th>Dosage</th></tr>
                        {% for med in data.medications %}
                        <tr><td>{{ med.name }}</td><td>{{ med.dosage }}</td></tr>
                        {% endfor %}
                    </table>
                    
                    <p style="margin-top: 20px;">
                        {% if data.compliance_rate >= 90 %}
                        🏆 <strong>Excellent!</strong> Great compliance this week. Keep it up!
                        {% elif data.compliance_rate >= 70 %}
                        👍 <strong>Good progress!</strong> A few missed doses, but overall good.
                        {% else %}
                        ⚠️ <strong>Needs attention.</strong> Several doses were missed this week.
                        {% endif %}
                    </p>
                </div>
                
                <div class="footer">
                    Report generated by MedGuardian<br>
                    {{ data.report_date }}
                </div>
            </div>
        </body>
        </html>
        """
        return render_template_string(template, data=report_data)
    
    def send_report(self, caregiver_email, senior_id):
        """Send weekly report to caregiver"""
        try:
            from app.utils.email_service import send_email
            
            report_data = self.generate_report_data(senior_id)
            if not report_data:
                return False
            
            html_content = self.generate_html_report(report_data)
            
            subject = f"📊 Weekly Report: {report_data['senior_name']}'s Medication Compliance"
            
            send_email(
                subject=subject,
                recipient=caregiver_email,
                body=f"Weekly compliance report for {report_data['senior_name']}",
                html_body=html_content
            )
            
            return True
        except Exception as e:
            print(f"Failed to send weekly report: {e}")
            return False
    
    def send_all_reports(self):
        """Send reports to all caregivers for their seniors"""
        from app.models.relationship import CaregiverSenior
        from app.models.auth import User
        
        relationships = CaregiverSenior.query.all()
        sent_count = 0
        
        for rel in relationships:
            caregiver = User.query.get(rel.caregiver_id)
            if caregiver and caregiver.email:
                if self.send_report(caregiver.email, rel.senior_id):
                    sent_count += 1
        
        return sent_count


# Singleton
weekly_report_service = WeeklyReportService()


def send_weekly_reports():
    """Function to be called by scheduler"""
    return weekly_report_service.send_all_reports()
