"""
Health Check Endpoint for Monitoring and Load Balancers
"""
from flask import Blueprint, jsonify
from datetime import datetime
from app.extensions import db
import sys

health = Blueprint('health', __name__)

@health.route('/health')
def health_check():
    """
    Health check endpoint for monitoring systems and load balancers.
    Returns 200 OK if system is healthy, 503 if issues detected.
    """
    checks = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'checks': {}
    }
    
    # Check database connectivity
    try:
        db.session.execute('SELECT 1')
        checks['checks']['database'] = 'ok'
    except Exception as e:
        checks['status'] = 'unhealthy'
        checks['checks']['database'] = f'error: {str(e)}'
    
    # Check Python version
    checks['checks']['python_version'] = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    
    # Overall status code
    status_code = 200 if checks['status'] == 'healthy' else 503
    
    return jsonify(checks), status_code


@health.route('/ping')
def ping():
    """Simple ping endpoint for basic availability check"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200
