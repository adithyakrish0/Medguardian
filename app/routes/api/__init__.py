"""API v1 Blueprint - RESTful API for MedGuardian"""
from flask import Blueprint

api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Import routes to register them
from . import medications, verification, users, auth, caregiver, senior, analytics, interactions, anomaly, explain, refills

__all__ = ['api_v1']

