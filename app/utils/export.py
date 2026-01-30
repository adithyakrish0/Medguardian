"""
Export functionality for medication data - PDF and CSV
"""
from flask import Response, make_response
from io import BytesIO, StringIO
import csv
from datetime import datetime

def export_to_csv(logs,  medications):
    """Export medication logs to CSV format"""
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Date', 'Time', 'Medication', 'Dosage', 'Status', 'Verified by Camera', 'Notes'])
    
    # Write data
    for log in logs:
        writer.writerow([
            log.taken_at.strftime('%Y-%m-%d'),
            log.taken_at.strftime('%I:%M %p'),
            log.medication.name,
            log.medication.dosage,
            'Taken' if log.taken_correctly else 'Missed',
            'Yes' if log.verified_by_camera else 'No',
            log.notes or ''
        ])
    
    # Create response
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = f'attachment; filename=medication_history_{datetime.now().strftime("%Y%m%d")}.csv'
    response.headers['Content-Type'] = 'text/csv'
    
    return response

def export_to_pdf(logs, medications, user):
    """Export medication logs to PDF format"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#007bff'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        title = Paragraph(f"MedGuardian - Medication History", title_style)
        elements.append(title)
        
        # User info
        info_style = styles['Normal']
        info = Paragraph(f"<b>User:</b> {user.username}<br/><b>Generated:</b> {datetime.now().strftime('%B %d, %Y %I:%M %p')}", info_style)
        elements.append(info)
        elements.append(Spacer(1, 0.3 * inch))
        
        # Summary statistics
        total_logs = len(logs)
        taken_correctly = sum(1 for log in logs if log.taken_correctly)
        compliance_rate = int((taken_correctly / total_logs * 100)) if total_logs > 0 else 0
        
        summary_data = [
            ['Total  Logs', 'Taken Correctly', 'Missed', 'Compliance Rate'],
            [str(total_logs), str(taken_correctly), str(total_logs - taken_correctly), f'{compliance_rate}%']
        ]
        
        summary_table = Table(summary_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#007bff')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.5 * inch))
        
        # Detailed logs table
        elements.append(Paragraph("<b>Detailed Log History</b>", styles['Heading2']))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Table data
        data = [['Date', 'Time', 'Medication', 'Dosage', 'Status']]
        
        for log in logs[:50]:  # Limit to 50 most recent
            data.append([
                log.taken_at.strftime('%m/%d/%Y'),
                log.taken_at.strftime('%I:%M %p'),
                log.medication.name[:20],  # Truncate long names
                log.medication.dosage[:15],
                '✓ Taken' if log.taken_correctly else '✗ Missed'
            ])
        
        # Create table
        log_table = Table(data, colWidths=[1.2*inch, 1.2*inch, 2*inch, 1.5*inch, 1.1*inch])
        log_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#28a745')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        elements.append(log_table)
        
        # Build PDF
        doc.build(elements)
        
        # Create response
        buffer.seek(0)
        response = make_response(buffer.getvalue())
        response.headers['Content-Disposition'] = f'attachment; filename=medication_history_{datetime.now().strftime("%Y%m%d")}.pdf'
        response.headers['Content-Type'] = 'application/pdf'
        
        return response
        
    except ImportError:
        # If reportlab not installed, return simple text file
        output = StringIO()
        output.write(f"MedGuardian - Medication History\n")
        output.write(f"User: {user.username}\n")
        output.write(f"Generated: {datetime.now().strftime('%B %d, %Y')}\n\n")
        output.write("="*80 + "\n\n")
        
        for log in logs:
            output.write(f"{log.taken_at.strftime('%Y-%m-%d %I:%M %p')} - {log.medication.name} ({log.medication.dosage})\n")
            output.write(f"Status: {'Taken' if log.taken_correctly else 'Missed'}\n\n")
        
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers['Content-Disposition'] = f'attachment; filename=medication_history_{datetime.now().strftime("%Y%m%d")}.txt'
        response.headers['Content-Type'] = 'text/plain'
        
        return response

def export_fleet_to_pdf(fleet_data, caregiver):
    """Export fleet summary report to PDF format"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Header
        title_style = ParagraphStyle(
            'FleetTitle',
            parent=styles['Heading1'],
            fontSize=26,
            textColor=colors.HexColor('#28a745'), # Green for fleet health
            spaceAfter=20,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("Fleet Adherence Report", title_style))
        elements.append(Paragraph(f"<b>Caregiver:</b> {caregiver.username}", styles['Normal']))
        elements.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
        elements.append(Spacer(1, 0.4 * inch))

        # Fleet Summary Table
        elements.append(Paragraph("<b>Fleet Overview</b>", styles['Heading2']))
        elements.append(Spacer(1, 0.2 * inch))

        summary_data = [['Senior Name', 'Total Meds', 'Compliance', 'Status']]
        for entry in fleet_data:
            senior = entry['senior']
            logs = entry['logs']
            meds = entry['medications']
            
            total_logs = len(logs)
            taken = sum(1 for l in logs if l.taken_correctly)
            compliance = int((taken/total_logs*100)) if total_logs > 0 else 0
            
            status = "Optimal" if compliance >= 80 else "Attention" if compliance >= 50 else "Critical"
            
            summary_data.append([
                senior.username,
                str(len(meds)),
                f"{compliance}%",
                status
            ])

        t = Table(summary_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#28a745')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.whitesmoke])
        ]))
        elements.append(t)
        elements.append(PageBreak())

        # Individual Breakdowns
        for entry in fleet_data:
            senior = entry['senior']
            logs = entry['logs']
            elements.append(Paragraph(f"<b>Patient Detail: {senior.username}</b>", styles['Heading2']))
            elements.append(Spacer(1, 0.2 * inch))
            
            data = [['Date', 'Medication', 'Status']]
            for log in logs[:10]: # Just show last 10
                data.append([
                    log.taken_at.strftime('%m/%d'),
                    log.medication.name[:30],
                    'Taken' if log.taken_correctly else 'Missed'
                ])
            
            st = Table(data, colWidths=[1.5*inch, 4*inch, 1.5*inch])
            st.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 0), (-1, -1), 9)
            ]))
            elements.append(st)
            elements.append(Spacer(1, 0.5 * inch))

        doc.build(elements)
        buffer.seek(0)
        response = make_response(buffer.getvalue())
        response.headers['Content-Disposition'] = f'attachment; filename=fleet_report_{datetime.now().strftime("%Y%m%d")}.pdf'
        response.headers['Content-Type'] = 'application/pdf'
        return response
    except Exception as e:
        return make_response(f"Export failed: {str(e)}", 500)
