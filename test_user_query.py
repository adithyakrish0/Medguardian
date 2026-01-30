from app import create_app, db
from app.models.auth import User
import traceback

app = create_app()
with app.app_context():
    try:
        print("Testing User query...")
        # Try to find a user (any user)
        user = User.query.first()
        print(f"✅ Query successful: {user}")
        if user:
            print(f"User data: {user.to_dict()}")
    except Exception as e:
        print("❌ Query failed!")
        traceback.print_exc()
