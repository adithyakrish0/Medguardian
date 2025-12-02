from app import create_app, db
from flask_migrate import Migrate

app = create_app()
migrate = Migrate(app, db)

if __name__ == "__main__":
    # Use port 5001 to avoid conflict with other Flask apps
    app.run(debug=True, port=5001)
