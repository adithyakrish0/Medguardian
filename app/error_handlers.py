import logging
from flask import jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register global error handlers for the Flask application."""

    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        from flask import request
        if request.path.startswith('/api/'):
            return jsonify({
                'success': False, 
                'message': 'CSRF verification failed', 
                'error': str(e.description) if hasattr(e, 'description') else 'Invalid CSRF token'
            }), 400
        from flask import render_template
        return render_template('errors/400.html', message="CSRF Error"), 400

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            'success': False,
            'message': 'Bad request',
            'error': str(e.description) if hasattr(e, 'description') else str(e)
        }), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({
            'success': False,
            'message': 'Unauthorized',
            'error': 'Authentication required'
        }), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({
            'success': False,
            'message': 'Forbidden',
            'error': 'Insufficient permissions'
        }), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'success': False,
            'message': 'Resource not found',
            'error': str(e.description) if hasattr(e, 'description') else 'The requested resource was not found'
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({
            'success': False,
            'message': 'Method not allowed',
            'error': 'The HTTP method is not allowed for this endpoint'
        }), 405

    @app.errorhandler(500)
    def internal_server_error(e):
        logger.error(f"Internal Server Error: {str(e)}", exc_info=True)
        
        # Ensure fallback for DB sessions
        from app.extensions import db
        try:
            db.session.rollback()
        except:
            pass
            
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': 'Something went wrong on our end. Please try again later.'
        }), 500

    @app.errorhandler(SQLAlchemyError)
    def handle_db_error(e):
        logger.error(f"Database Error: {str(e)}", exc_info=True)
        
        from app.extensions import db
        try:
            db.session.rollback()
        except:
            pass
            
        return jsonify({
            'success': False,
            'message': 'Database operation failed',
            'error': 'A storage error occurred. Your operation could not be completed.'
        }), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        # Pass through HTTP errors to their specific handlers
        if isinstance(e, HTTPException):
            return e

        logger.critical(f"Unhandled Exception: {str(e)}", exc_info=True)
        
        from app.extensions import db
        try:
            db.session.rollback()
        except:
            pass
            
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e) if app.debug else 'Internal application error'
        }), 500
