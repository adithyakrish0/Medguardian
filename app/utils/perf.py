# app/utils/perf.py
"""
Performance logging utilities for Flask routes.

Usage:
    from app.utils.perf import log_performance

    @app.route('/api/medications')
    @log_performance
    def get_medications():
        # Your existing code
        pass
"""

import time
from functools import wraps
from flask import request, g


def log_performance(f):
    """
    Decorator to log route performance.
    Logs start/end times to console with emoji markers.
    
    Output format:
        🟢 START: /api/medications
        🔴 END: /api/medications - 234.56ms
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        route = request.path
        method = request.method
        
        print(f"🟢 START: {method} {route}")
        start_time = time.time()
        
        try:
            result = f(*args, **kwargs)
            return result
        finally:
            duration = (time.time() - start_time) * 1000  # Convert to ms
            seconds = duration / 1000
            print(f"🔴 END: {method} {route} - {duration:.2f}ms ({seconds:.2f}s)")
            
    return decorated_function


def log_db_query(query_name: str):
    """
    Context manager for logging database query performance.
    
    Usage:
        with log_db_query('fetch_medications'):
            result = db.session.execute(query)
    """
    class QueryTimer:
        def __init__(self, name):
            self.name = name
            self.start = None
            
        def __enter__(self):
            print(f"  📊 DB START: {self.name}")
            self.start = time.time()
            return self
            
        def __exit__(self, *args):
            duration = (time.time() - self.start) * 1000
            print(f"  📊 DB END: {self.name} - {duration:.2f}ms")
    
    return QueryTimer(query_name)


class PerformanceMiddleware:
    """
    WSGI middleware to log all request performance.
    
    Usage in create_app():
        app.wsgi_app = PerformanceMiddleware(app.wsgi_app)
    """
    def __init__(self, app):
        self.app = app
        
    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '/')
        method = environ.get('REQUEST_METHOD', 'GET')
        
        start_time = time.time()
        
        def custom_start_response(status, headers, exc_info=None):
            duration = (time.time() - start_time) * 1000
            print(f"⏱️ {method} {path} - {status.split()[0]} - {duration:.2f}ms")
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response)
