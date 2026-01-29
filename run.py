# =============================================================================
# CRITICAL: eventlet monkey-patching MUST be the very first import
# =============================================================================
import eventlet
eventlet.monkey_patch()

import os
from app import create_app, db
from flask_migrate import Migrate

app = create_app()
migrate = Migrate(app, db)

if __name__ == "__main__":
    # CRITICAL: Must use socketio.run() for SocketIO to work
    # Using app.run() causes all SocketIO endpoints to return 404
    from app.extensions import socketio
    
    # Read debug mode from environment (default: False for production safety)
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Check if SocketIO initialized successfully
    if socketio.server is not None:
        print("Starting server with SocketIO support on 127.0.0.1...")
        socketio.run(app, debug=debug_mode, port=5001, host='127.0.0.1', allow_unsafe_werkzeug=True, use_reloader=False)
    else:
        print("⚠️ SocketIO not initialized, starting on 127.0.0.1 without real-time features...")
        app.run(debug=debug_mode, port=5001, host='127.0.0.1')
