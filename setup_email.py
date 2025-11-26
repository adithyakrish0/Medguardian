"""
Email SMTP Configuration Wizard for MedGuardian
Interactive setup for email notifications
"""

import os
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def load_env_file():
    """Load current .env file"""
    env_path = '.env'
    env_vars = {}
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    
    return env_vars, env_path

def save_env_file(env_vars, env_path):
    """Save updated .env file"""
    with open(env_path, 'w') as f:
        f.write("# MedGuardian Development Environment\n")
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")

def validate_email(email):
    """Basic email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def get_smtp_preset(provider):
    """Get SMTP settings for common providers"""
    presets = {
        '1': {  # Gmail
            'name': 'Gmail',
            'server': 'smtp.gmail.com',
            'port': 587,
            'tls': True,
            'instructions': """
Gmail App Password Setup:
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication if not enabled
3. Go to https://myaccount.google.com/apppasswords
4. Select 'Mail' and 'Other (Custom name)'
5. Name it 'MedGuardian'
6. Copy the 16-character password (no spaces)
7. Use this password below (not your regular Gmail password)
"""
        },
        '2': {  # Outlook
            'name': 'Outlook/Hotmail',
            'server': 'smtp-mail.outlook.com',
            'port': 587,
            'tls': True,
            'instructions': """
Outlook Setup:
1. You can use your regular Outlook password
2. Or create an App Password at:
   https://account.microsoft.com/security
3. Go to 'Advanced security options'
4. Select 'App passwords'
5. Create a new app password
"""
        },
        '3': {  # Yahoo
            'name': 'Yahoo',
            'server': 'smtp.mail.yahoo.com',
            'port': 587,
            'tls': True,
            'instructions': """
Yahoo App Password Setup:
1. Go to https://login.yahoo.com/account/security
2. Turn on 2-Factor Authentication
3. Generate an app password
4. Select 'Other App' and name it 'MedGuardian'
5. Use the generated password below
"""
        }
    }
    return presets.get(provider)

def test_smtp_connection(server, port, username, password, use_tls):
    """Test SMTP connection"""
    print("\n📧 Testing SMTP connection...")
    
    try:
        # Connect to SMTP server
        if use_tls:
            smtp = smtplib.SMTP(server, port, timeout=10)
            smtp.starttls()
        else:
            smtp = smtplib.SMTP_SSL(server, port, timeout=10)
        
        # Login
        smtp.login(username, password)
        
        # Create test email
        msg = MIMEMultipart()
        msg['From'] = username
        msg['To'] = username
        msg['Subject'] = 'MedGuardian - Test Email'
        
        body = """
        <html>
            <body>
                <h2>✅ Success!</h2>
                <p>Your MedGuardian email configuration is working correctly.</p>
                <p>You will now receive medication reminders and alerts at this email address.</p>
                <br>
                <p><small>This is an automated test message from MedGuardian.</small></p>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Send
        smtp.send_message(msg)
        smtp.quit()
        
        print("✅ Connection successful!")
        print(f"✅ Test email sent to {username}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Authentication failed. Check your username/password.")
        print("   For Gmail/Outlook/Yahoo, make sure you're using an App Password, not your regular password.")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ SMTP error: {e}")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def main():
    print("="*70)
    print("MedGuardian - Email SMTP Configuration Wizard")
    print("="*70)
    
    # Load current .env
    env_vars, env_path = load_env_file()
    
    # Show current configuration
    current_email = env_vars.get('MAIL_USERNAME', '')
    if current_email:
        print(f"\nCurrent email: {current_email}")
        if input("Keep this configuration? (yes/no): ").strip().lower() in ['yes', 'y']:
            print("✅ Keeping existing configuration")
            return
    
    # Choose provider
    print("\nSelect your email provider:")
    print("  1. Gmail")
    print("  2. Outlook/Hotmail")
    print("  3. Yahoo")
    print("  4. Custom SMTP Server")
    
    provider_choice = input("\nEnter choice (1-4): ").strip()
    
    if provider_choice in ['1', '2', '3']:
        preset = get_smtp_preset(provider_choice)
        print(f"\n📧 Configuring {preset['name']}")
        print(preset['instructions'])
        
        server = preset['server']
        port = preset['port']
        use_tls = preset['tls']
    else:
        print("\n📧 Custom SMTP Configuration")
        server = input("SMTP Server (e.g., smtp.example.com): ").strip()
        port = int(input("SMTP Port (usually 587 for TLS or 465 for SSL): ").strip())
        use_tls = input("Use TLS? (yes/no): ").strip().lower() in ['yes', 'y']
    
    # Get credentials
    print("\n📝 Enter your email credentials:")
    
    while True:
        username = input("Email address: ").strip()
        if validate_email(username):
            break
        print("❌ Invalid email format. Please try again.")
    
    password = input("Password (or App Password): ").strip()
    
    if not password:
        print("❌ Password cannot be empty")
        return
    
    # Test connection
    if test_smtp_connection(server, port, username, password, use_tls):
        # Save to .env
        env_vars['MAIL_SERVER'] = server
        env_vars['MAIL_PORT'] = str(port)
        env_vars['MAIL_USE_TLS'] = 'True' if use_tls else 'False'
        env_vars['MAIL_USERNAME'] = username
        env_vars['MAIL_PASSWORD'] = password
        env_vars['MAIL_DEFAULT_SENDER'] = username
        
        save_env_file(env_vars, env_path)
        
        print(f"\n✅ Configuration saved to {env_path}")
        print("✅ Email notifications are now enabled!")
        print("\n⚠️  IMPORTANT: Restart your Flask application for changes to take effect")
    else:
        print("\n❌ Configuration was NOT saved due to connection failure.")
        print("Please check your credentials and try again.")
        
        if input("\nSave anyway? (yes/no): ").strip().lower() in ['yes', 'y']:
            env_vars['MAIL_SERVER'] = server
            env_vars['MAIL_PORT'] = str(port)
            env_vars['MAIL_USE_TLS'] = 'True' if use_tls else 'False'
            env_vars['MAIL_USERNAME'] = username
            env_vars['MAIL_PASSWORD'] = password
            env_vars['MAIL_DEFAULT_SENDER'] = username
            
            save_env_file(env_vars, env_path)
            print(f"✅ Configuration saved to {env_path} (untested)")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Configuration cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
