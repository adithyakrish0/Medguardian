# =============================================================================
# WSGI Entry Point for Production Deployment
# =============================================================================
# CRITICAL: eventlet monkey-patching MUST be the very first import
# before any other imports (including Flask). This patches the Python
# standard library to make blocking I/O operations cooperative, enabling
# greenlet-based concurrency for WebSocket connections.
#
# If monkey_patch() is called after other imports, you may encounter:
# - Greenlet conflicts
# - Blocking I/O that doesn't yield
# - WebSocket connection failures
# =============================================================================

import eventlet
eventlet.monkey_patch()

# Now it's safe to import the rest of the application
from app import create_app

# Create the application instance
# The 'production' config is selected via FLASK_ENV environment variable
app = create_app()

if __name__ == "__main__":
    app.run()
