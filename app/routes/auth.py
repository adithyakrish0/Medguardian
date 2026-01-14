# app/routes/auth.py
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from app.extensions import db

# Import User inside functions to avoid circular imports
def get_user_model():
    from app.models.auth import User
    return User

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    User = get_user_model()
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        
        # Try to find user by username or email
        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user or not user.check_password(password):
            flash('Invalid username/email or password. Please try again.')
            return redirect(url_for('auth.login'))
        
        login_user(user, remember=remember)
        return redirect(url_for('main.dashboard'))
    
    return render_template('auth/login.html')

@auth.route('/register', methods=['GET', 'POST'])
def register():
    User = get_user_model()
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role', 'senior')  # Default to 'senior' if not provided
        
        # Check for existing username
        user_by_username = User.query.filter_by(username=username).first()
        if user_by_username:
            flash('Username already exists. Please choose a different username.')
            return redirect(url_for('auth.register'))
        
        # Check for existing email
        user_by_email = User.query.filter_by(email=email).first()
        if user_by_email:
            flash('Email address already exists. Please use a different email.')
            return redirect(url_for('auth.register'))
        
        try:
            import secrets
            
            new_user = User(username=username, email=email, role=role)
            new_user.set_password(password)
            new_user.email_verified = False
            new_user.email_verification_token = secrets.token_urlsafe(32)
            
            db.session.add(new_user)
            db.session.commit()
            
            # Send verification email (optional - don't fail if email fails)
            try:
                from flask import current_app
                from flask_mail import Message
                from app.extensions import mail
                
                verify_url = url_for('auth.verify_email', token=new_user.email_verification_token, _external=True)
                msg = Message(
                    'MedGuardian - Verify Your Email',
                    sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com'),
                    recipients=[email]
                )
                msg.body = f'''Welcome to MedGuardian!

Please verify your email by clicking this link:
{verify_url}

If you did not create this account, please ignore this email.
'''
                mail.send(msg)
                flash('Registration successful! Please check your email to verify your account.')
            except Exception as e:
                print(f"Email send failed: {e}")
                flash('Registration successful! Please login to continue.')
            
            return redirect(url_for('auth.login'))
            
        except Exception as e:
            db.session.rollback()
            flash('Registration failed. Please try again.')
            return redirect(url_for('auth.register'))
    
    return render_template('auth/register.html')

@auth.route('/verify-email/<token>')
def verify_email(token):
    """Verify user email address"""
    User = get_user_model()
    user = User.query.filter_by(email_verification_token=token).first()
    
    if not user:
        flash('Invalid verification link.')
        return redirect(url_for('auth.login'))
    
    if user.email_verified:
        flash('Email already verified. Please login.')
        return redirect(url_for('auth.login'))
    
    user.email_verified = True
    user.email_verification_token = None
    db.session.commit()
    
    flash('Email verified successfully! You can now login.')
    return redirect(url_for('auth.login'))


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))

@auth.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Request password reset"""
    if request.method == 'POST':
        email = request.form.get('email')
        User = get_user_model()
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Generate reset token
            import secrets
            from datetime import datetime, timedelta
            
            token = secrets.token_urlsafe(32)
            user.reset_token = token
            user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
            db.session.commit()
            
            # Send email (in background, don't fail if email fails)
            try:
                from flask import current_app
                from flask_mail import Message
                from app.extensions import mail
                
                reset_url = url_for('auth.reset_password', token=token, _external=True)
                msg = Message(
                    'MedGuardian - Password Reset',
                    sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com'),
                    recipients=[email]
                )
                msg.body = f'''To reset your password, visit the following link:

{reset_url}

This link expires in 1 hour.

If you did not request a password reset, please ignore this email.
'''
                mail.send(msg)
            except Exception as e:
                # Log but don't expose email errors to user
                print(f"Email send failed: {e}")
        
        # Always show success message (security: don't reveal if email exists)
        flash('If an account exists with that email, a reset link has been sent.')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/forgot_password.html')

@auth.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Reset password with token"""
    User = get_user_model()
    from datetime import datetime
    
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        flash('Invalid or expired reset link. Please request a new one.')
        return redirect(url_for('auth.forgot_password'))
    
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match.')
            return redirect(url_for('auth.reset_password', token=token))
        
        if len(password) < 6:
            flash('Password must be at least 6 characters.')
            return redirect(url_for('auth.reset_password', token=token))
        
        # Update password and clear token
        user.set_password(password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()
        
        flash('Password reset successful! Please login with your new password.')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/reset_password.html', token=token)

@auth.route('/resend-verification', methods=['GET', 'POST'])
@login_required
def resend_verification():
    """Resend email verification"""
    from flask_login import current_user
    
    if current_user.email_verified:
        flash('Your email is already verified.')
        return redirect(url_for('main.dashboard'))
    
    if request.method == 'POST':
        import secrets
        
        current_user.email_verification_token = secrets.token_urlsafe(32)
        db.session.commit()
        
        try:
            from flask import current_app
            from flask_mail import Message
            from app.extensions import mail
            
            verify_url = url_for('auth.verify_email', token=current_user.email_verification_token, _external=True)
            msg = Message(
                'MedGuardian - Verify Your Email',
                sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@medguardian.com'),
                recipients=[current_user.email]
            )
            msg.body = f'''Please verify your email by clicking this link:

{verify_url}

If you did not request this, please ignore this email.
'''
            mail.send(msg)
            flash('Verification email sent! Please check your inbox.')
        except Exception as e:
            print(f"Email send failed: {e}")
            flash('Could not send email. Please try again later.')
        
        return redirect(url_for('main.dashboard'))
    
    return render_template('auth/resend_verification.html')

@auth.route('/account-settings', methods=['GET', 'POST'])
@login_required
def account_settings():
    """Account settings page"""
    from flask_login import current_user
    return render_template('auth/account_settings.html', user=current_user)

@auth.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change password while logged in"""
    from flask_login import current_user
    
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    if not current_user.check_password(current_password):
        flash('Current password is incorrect.')
        return redirect(url_for('auth.account_settings'))
    
    if new_password != confirm_password:
        flash('New passwords do not match.')
        return redirect(url_for('auth.account_settings'))
    
    if len(new_password) < 6:
        flash('Password must be at least 6 characters.')
        return redirect(url_for('auth.account_settings'))
    
    current_user.set_password(new_password)
    db.session.commit()
    
    flash('Password changed successfully!')
    return redirect(url_for('auth.account_settings'))

@auth.route('/update-camera-preference', methods=['POST'])
@login_required
def update_camera_preference():
    """Update camera privacy preference"""
    from flask_login import current_user
    
    preference = request.form.get('camera_preference', 'ask')
    
    # Update preference (auto = True, ask = False)
    current_user.camera_auto_accept = (preference == 'auto')
    db.session.commit()
    
    if preference == 'auto':
        flash('Camera set to auto-accept for linked caregivers.')
    else:
        flash('Camera set to always ask for permission.')
    
    return redirect(url_for('auth.account_settings'))
