# app/routes/contacts.py
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.emergency_contact import EmergencyContact

contacts = Blueprint('contacts', __name__)

@contacts.route('/')
@login_required
def list_contacts():
    """List all emergency contacts"""
    user_contacts = EmergencyContact.query.filter_by(user_id=current_user.id)\
        .order_by(EmergencyContact.priority).all()
    return render_template('contacts/list.html', contacts=user_contacts)

@contacts.route('/add', methods=['GET', 'POST'])
@login_required
def add_contact():
    """Add a new emergency contact"""
    if request.method == 'POST':
        name = request.form.get('name')
        relationship = request.form.get('relationship')
        phone = request.form.get('phone')
        email = request.form.get('email')
        priority = int(request.form.get('priority', 1))
        notify_sos = request.form.get('notify_sos') == 'on'
        notify_missed = request.form.get('notify_missed') == 'on'
        
        if not name or not relationship:
            flash('Name and relationship are required.', 'danger')
            return redirect(url_for('contacts.add_contact'))
        
        contact = EmergencyContact(
            user_id=current_user.id,
            name=name,
            relationship=relationship,
            phone=phone,
            email=email,
            priority=priority,
            notify_for_emergency=notify_sos,
            notify_for_missed_dose=notify_missed
        )
        
        db.session.add(contact)
        db.session.commit()
        
        flash(f'Emergency contact "{name}" added successfully!', 'success')
        return redirect(url_for('contacts.list_contacts'))
    
    return render_template('contacts/add.html')

@contacts.route('/edit/<int:contact_id>', methods=['GET', 'POST'])
@login_required
def edit_contact(contact_id):
    """Edit an emergency contact"""
    contact = EmergencyContact.query.filter_by(
        id=contact_id, 
        user_id=current_user.id
    ).first_or_404()
    
    if request.method == 'POST':
        contact.name = request.form.get('name')
        contact.relationship = request.form.get('relationship')
        contact.phone = request.form.get('phone')
        contact.email = request.form.get('email')
        contact.priority = int(request.form.get('priority', 1))
        contact.notify_for_emergency = request.form.get('notify_sos') == 'on'
        contact.notify_for_missed_dose = request.form.get('notify_missed') == 'on'
        
        db.session.commit()
        
        flash(f'Contact "{contact.name}" updated successfully!', 'success')
        return redirect(url_for('contacts.list_contacts'))
    
    return render_template('contacts/edit.html', contact=contact)

@contacts.route('/delete/<int:contact_id>', methods=['POST'])
@login_required
def delete_contact(contact_id):
    """Delete an emergency contact"""
    contact = EmergencyContact.query.filter_by(
        id=contact_id, 
        user_id=current_user.id
    ).first_or_404()
    
    name = contact.name
    db.session.delete(contact)
    db.session.commit()
    
    flash(f'Contact "{name}" deleted.', 'success')
    return redirect(url_for('contacts.list_contacts'))

@contacts.route('/api/list')
@login_required
def api_list_contacts():
    """API endpoint to get all contacts"""
    user_contacts = EmergencyContact.query.filter_by(user_id=current_user.id)\
        .order_by(EmergencyContact.priority).all()
    return jsonify([c.to_dict() for c in user_contacts])

# Caregiver view of senior's contacts
@contacts.route('/senior/<int:senior_id>')
@login_required
def senior_contacts(senior_id):
    """View/edit a senior's emergency contacts (for caregivers)"""
    if current_user.role != 'caregiver':
        flash('Access denied.', 'danger')
        return redirect(url_for('main.dashboard'))
    
    # Verify caregiver has access to this senior
    from app.models.relationship import CaregiverSenior
    relationship = CaregiverSenior.query.filter_by(
        caregiver_id=current_user.id,
        senior_id=senior_id
    ).first()
    
    if not relationship:
        flash('You do not have access to this senior.', 'danger')
        return redirect(url_for('caregiver.dashboard'))
    
    from app.models.auth import User
    senior = User.query.get_or_404(senior_id)
    user_contacts = EmergencyContact.query.filter_by(user_id=senior_id)\
        .order_by(EmergencyContact.priority).all()
    
    return render_template('contacts/senior_contacts.html', 
                         senior=senior, 
                         contacts=user_contacts)
