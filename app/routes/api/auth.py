"""API v1 - Auth endpoints"""
import os
import sys
from flask import jsonify, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from . import api_v1
from app.models.auth import User
from app.extensions import db

@api_v1.route('/auth/ping', methods=['GET'])
def api_ping():
    """Simple ping to verify API is reachable"""
    return jsonify({'success': True, 'message': 'pong', 'db_url': current_app.config.get('SQLALCHEMY_DATABASE_URI', 'NOT SET')[:50] + '...'}), 200

@api_v1.route('/auth/db-test', methods=['GET'])
def api_db_test():
    """Test database connection"""
    try:
        result = db.session.execute(db.text('SELECT 1')).fetchone()
        return jsonify({'success': True, 'message': 'DB connection OK', 'result': str(result)}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': 'DB connection FAILED', 'error': str(e)}), 500

@api_v1.route('/auth/login', methods=['POST'])
def api_login():
    """Login via REST API"""
    print(f"[DEBUG] api_login called", file=sys.stderr, flush=True)
    try:
        data = request.get_json()
        print(f"[DEBUG] Request data: {data}", file=sys.stderr, flush=True)
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        remember = data.get('remember', False)
        
        print(f"[DEBUG] Querying user: {username}", file=sys.stderr, flush=True)
        user = User.query.filter((User.username == username) | (User.email == username)).first()
        print(f"[DEBUG] User found: {user}", file=sys.stderr, flush=True)
        
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        login_user(user, remember=remember)
        return jsonify({
            'success': True,
            'message': 'Logged in successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            }
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[CRITICAL] Login error: {e}", file=sys.stderr, flush=True)
        return jsonify({'success': False, 'message': 'Login failed', 'error': str(e)}), 500


@api_v1.route('/auth/logout', methods=['POST'])
@login_required
def api_logout():
    """Logout via REST API"""
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@api_v1.route('/auth/register', methods=['POST'])
def api_register():
    """Register via REST API"""
    data = request.get_json()
    print(f"DEBUG: api_register hit with data: {data}")
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'senior')
    
    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    # Check for existing user
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 409
    
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already exists'}), 409
    
    try:
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log the user in after registration
        login_user(new_user)
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'role': new_user.role
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@api_v1.route('/auth/status', methods=['GET'])
def api_status():
    """Check current auth status"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'full_name': current_user.full_name,
                'role': current_user.role,
                'phone': current_user.phone
            }
        }), 200
    return jsonify({'authenticated': False}), 200

@api_v1.route('/auth/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile (name, username, email, phone, etc)"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    if 'full_name' in data:
        current_user.full_name = data.get('full_name')
        
    if 'username' in data:
        new_username = data.get('username')
        if new_username != current_user.username:
            if User.query.filter_by(username=new_username).first():
                return jsonify({'success': False, 'message': 'Username already exists'}), 409
            current_user.username = new_username
            
    if 'email' in data:
        new_email = data.get('email')
        if new_email != current_user.email:
            if User.query.filter_by(email=new_email).first():
                return jsonify({'success': False, 'message': 'Email already exists'}), 409
            current_user.email = new_email

    if 'phone' in data:
        current_user.phone = data.get('phone')
        
    if 'camera_auto_accept' in data:
        current_user.camera_auto_accept = bool(data.get('camera_auto_accept'))
        
    db.session.commit()
    return jsonify({
        'success': True, 
        'message': 'Profile updated successfully',
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'full_name': current_user.full_name,
            'email': current_user.email,
            'phone': current_user.phone,
            'camera_auto_accept': current_user.camera_auto_accept
        }
    })

@api_v1.route('/auth/change-password', methods=['POST'])
@login_required
def change_password():
    """Change current user's password"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Old and new passwords are required'}), 400
        
    if not current_user.check_password(old_password):
        return jsonify({'success': False, 'message': 'Incorrect current password'}), 401
        
    try:
        current_user.set_password(new_password)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Password updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
