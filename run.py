from app import create_app, db
from flask_migrate import Migrate

app = create_app()
migrate = Migrate(app, db)

if __name__ == "__main__":
    # CRITICAL: Must use socketio.run() for SocketIO to work
    # Using app.run() causes all SocketIO endpoints to return 404
    from app.extensions import socketio
    
    # Check if SocketIO initialized successfully
    if socketio.server is not None:
        print("🚀 Starting server with SocketIO support...")
        socketio.run(app, debug=True, port=5001, allow_unsafe_werkzeug=True)
    else:
        print("⚠️ SocketIO not initialized, starting without real-time features...")
        app.run(debug=True, port=5001)
