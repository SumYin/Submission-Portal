from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User
import uuid

auth = Blueprint('auth', __name__)

@auth.route('/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    user = User(id=str(uuid.uuid4()), username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user)
    return jsonify(user.to_dict())

@auth.route('/auth/signin', methods=['POST'])
def signin():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        login_user(user)
        return jsonify(user.to_dict())
    
    return jsonify({'error': 'Invalid credentials'}), 401

@auth.route('/auth/signout', methods=['POST'])
@login_required
def signout():
    logout_user()
    return '', 204

@auth.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return jsonify(current_user.to_dict())

@auth.route('/me/profile', methods=['GET'])
@login_required
def get_profile():
    # Placeholder for profile data if we had a separate profile table
    # For now just return user info or empty dict
    return jsonify({})
