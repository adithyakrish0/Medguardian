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
