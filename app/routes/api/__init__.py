from flask import Blueprint
api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Import routes to register them
from . import medications, verification, users, auth, caregiver, senior, analytics, interactions, anomaly, explain, refills, emergency, export
# Import backend routes (standard python package import since it's outside app package)
from backend.routes.api import assistant

__all__ = ['api_v1']


