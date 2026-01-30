"""API v1 - Auth endpoints"""
from flask import jsonify, request
from flask_login import login_user, logout_user, login_required, current_user
from . import api_v1
from app.models.auth import User
from app.extensions import db

@api_v1.route('/auth/login', methods=['POST'])
def api_login():
    """Login via REST API"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    remember = data.get('remember', False)
    
    user = User.query.filter((User.username == username) | (User.email == username)).first()
    
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
                'role': current_user.role,
                'phone': current_user.phone
            }
        }), 200
    return jsonify({'authenticated': False}), 200

@api_v1.route('/auth/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile (phone, etc)"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    if 'phone' in data:
        current_user.phone = data.get('phone')
        
    db.session.commit()
    return jsonify({
        'success': True, 
        'message': 'Profile updated',
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'phone': current_user.phone
        }
    })
