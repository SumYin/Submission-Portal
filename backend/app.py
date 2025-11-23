from flask import Flask, jsonify
from flask_cors import CORS
from flask_login import LoginManager
from config import Config
from models import db, User
from auth import auth as auth_bp
from routes import api as api_bp
import os

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    login = LoginManager(app)
    # login.login_view = 'auth.signin' # Removed to prevent redirect
    
    # Enable CORS with explicit configuration
    CORS(app, 
         resources={r"/*": {"origins": "*"}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    @login.user_loader
    def load_user(id):
        return User.query.get(id)

    @login.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Unauthorized'}), 401

    # Create DB tables if they don't exist
    with app.app_context():
        db.create_all()
        # Ensure upload folder exists
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])

    return app

if __name__ == '__main__':
    app = create_app()
    # Run on 0.0.0.0 to allow LAN access
    app.run(host='0.0.0.0', port=5000, debug=True)
