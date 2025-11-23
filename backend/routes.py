from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from models import db, Form, Submission, SubmissionValidationResult, User
from storage import save_file, delete_file
from validation import validate_submission, get_file_info
import uuid
import os
from datetime import datetime

api = Blueprint('api', __name__)

@api.route('/api/debug', methods=['GET'])
def debug():
    return jsonify({
        'status': 'online',
        'backend': 'flask',
        'database': current_app.config['SQLALCHEMY_DATABASE_URI'],
        'upload_folder': current_app.config['UPLOAD_FOLDER'],
        'cwd': os.getcwd()
    })


@api.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get basic user information by ID"""
    user = User.query.get_or_404(user_id)
    return jsonify({'id': user.id, 'username': user.username})

@api.route('/users/<user_id>/profile', methods=['GET'])
def get_user_profile(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({'name': user.username, 'email': user.email})

@api.route('/me/profile', methods=['GET'])
@login_required
def get_my_profile():
    """Get the current user's profile"""
    return jsonify({'name': current_user.username, 'email': current_user.email})

@api.route('/me/profile', methods=['PATCH'])
@login_required
def update_my_profile():
    """Update the current user's profile"""
    data = request.get_json()
    
    # Update allowed fields
    if 'name' in data:
        # Check if username is already taken by another user
        existing = User.query.filter_by(username=data['name']).first()
        if existing and existing.id != current_user.id:
            return jsonify({'error': 'Username already taken'}), 400
        current_user.username = data['name']
    
    if 'email' in data:
        # Check if email is already taken by another user
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != current_user.id:
            return jsonify({'error': 'Email already taken'}), 400
        current_user.email = data['email']
    
    db.session.commit()
    return jsonify({'name': current_user.username, 'email': current_user.email})

# --- Forms ---

@api.route('/forms', methods=['POST'])
@login_required
def create_form():
    data = request.get_json()
    # Basic validation
    if not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    form = Form(
        id=str(uuid.uuid4()),
        title=data['title'],
        description=data.get('description'),
        code=data.get('code') or uuid.uuid4().hex[:6],
        constraints=data.get('constraints', {}),
        allow_multiple_submissions=data.get('allowMultipleSubmissionsPerUser', False),
        max_submissions=data.get('maxSubmissionsPerUser', 1),
        opens_at=datetime.fromisoformat(data['opensAt'].replace('Z', '+00:00')) if data.get('opensAt') else None,
        closes_at=datetime.fromisoformat(data['closesAt'].replace('Z', '+00:00')) if data.get('closesAt') else None,
        created_by=current_user.id
    )
    db.session.add(form)
    db.session.commit()
    return jsonify(form.to_dict())

@api.route('/forms/mine', methods=['GET'])
@login_required
def list_my_forms():
    forms = Form.query.filter_by(created_by=current_user.id).all()
    return jsonify([f.to_dict() for f in forms])

@api.route('/forms/<form_id>', methods=['GET'])
def get_form(form_id):
    form = Form.query.get_or_404(form_id)
    return jsonify(form.to_dict())

@api.route('/forms/<form_id>', methods=['PATCH'])
@login_required
def update_form(form_id):
    form = Form.query.get_or_404(form_id)
    
    # Check ownership
    if form.created_by != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    data = request.get_json()
    
    # Update allowed fields
    if 'title' in data:
        form.title = data['title']
    if 'description' in data:
        form.description = data['description']
    if 'code' in data:
        form.code = data['code']
    if 'constraints' in data:
        form.constraints = data['constraints']
    if 'allowMultipleSubmissionsPerUser' in data:
        form.allow_multiple_submissions = data['allowMultipleSubmissionsPerUser']
    if 'maxSubmissionsPerUser' in data:
        form.max_submissions = data['maxSubmissionsPerUser']
    if 'opensAt' in data:
        form.opens_at = datetime.fromisoformat(data['opensAt'].replace('Z', '+00:00')) if data['opensAt'] else None
    if 'closesAt' in data:
        form.closes_at = datetime.fromisoformat(data['closesAt'].replace('Z', '+00:00')) if data['closesAt'] else None
    
    db.session.commit()
    return jsonify(form.to_dict())

@api.route('/forms/<form_id>', methods=['DELETE'])
@login_required
def delete_form(form_id):
    form = Form.query.get_or_404(form_id)
    
    # Check ownership
    if form.created_by != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    # Delete all associated submissions and their files
    submissions = Submission.query.filter_by(form_id=form_id).all()
    for submission in submissions:
        if submission.file_path:
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], submission.file_path)
            delete_file(file_path)
        db.session.delete(submission)
    
    # Delete the form
    db.session.delete(form)
    db.session.commit()
    
    return '', 204

@api.route('/forms/code/<code>', methods=['GET'])
def get_form_by_code(code):
    form = Form.query.filter_by(code=code).first_or_404()
    return jsonify(form.to_dict())

@api.route('/forms/<form_id>/submissions', methods=['GET'])
@login_required
def get_form_submissions(form_id):
    form = Form.query.get_or_404(form_id)
    if form.created_by != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    
    submissions = Submission.query.filter_by(form_id=form_id).all()
    return jsonify({
        'items': [s.to_dict() for s in submissions],
        'total': len(submissions),
        'page': 1,
        'pageSize': len(submissions)
    })

# --- Submissions ---

@api.route('/submit/<code>/validate', methods=['GET'])
def validate_code(code):
    form = Form.query.filter_by(code=code).first()
    if not form:
        return jsonify({'ok': False, 'reason': 'Code not found'})
    
    now = datetime.utcnow()
    if form.opens_at and now < form.opens_at:
        return jsonify({'ok': False, 'reason': 'Submissions not open yet', 'form': form.to_dict()})
    if form.closes_at and now > form.closes_at:
        return jsonify({'ok': False, 'reason': 'Submissions closed', 'form': form.to_dict()})
        
    return jsonify({'ok': True, 'form': form.to_dict()})

@api.route('/submit/<code>', methods=['POST'])
def submit_file(code):
    form = Form.query.filter_by(code=code).first_or_404()
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'ok': False, 'errors': ['No file part']}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'ok': False, 'errors': ['No selected file']}), 400

    # Save temporarily
    try:
        file_path, original_filename = save_file(file, current_app.config['UPLOAD_FOLDER'])
    except Exception as e:
        return jsonify({'ok': False, 'errors': [f'Upload failed: {str(e)}']}), 500

    # Validate
    passed, message, metadata = validate_submission(file_path, file.mimetype, form.constraints or {})

    if not passed:
        delete_file(file_path) # Cleanup invalid file
        return jsonify({'ok': False, 'errors': [message]})

    # Create Submission Record
    # Store only the filename (not full path) for portability
    relative_path = os.path.basename(file_path)
    submission = Submission(
        id=str(uuid.uuid4()),
        form_id=form.id,
        submitted_by=current_user.id if current_user.is_authenticated else None,
        status='accepted',
        filename=original_filename,
        file_path=relative_path,
        size_bytes=os.path.getsize(file_path),
        mime_type=file.mimetype,
        metadata_json=metadata
    )
    db.session.add(submission)
    db.session.commit()

    return jsonify({'ok': True, 'submission': submission.to_dict()})

@api.route('/me/submissions', methods=['GET'])
@login_required
def list_my_submissions():
    submissions = Submission.query.filter_by(submitted_by=current_user.id).all()
    return jsonify([s.to_dict() for s in submissions])

@api.route('/submissions/<submission_id>', methods=['DELETE'])
@login_required
def delete_submission(submission_id):
    submission = Submission.query.get_or_404(submission_id)
    
    # Check if user has permission (either the submitter OR the form owner)
    form = Form.query.get(submission.form_id)
    is_submitter = submission.submitted_by == current_user.id
    is_form_owner = form and form.created_by == current_user.id
    
    if not (is_submitter or is_form_owner):
        return jsonify({'error': 'Forbidden'}), 403
    
    # Delete associated file
    if submission.file_path:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], submission.file_path)
        delete_file(file_path)
    
    # Delete submission record
    db.session.delete(submission)
    db.session.commit()
    
    return '', 204

# --- File Downloads ---

@api.route('/submissions/<submission_id>/download', methods=['GET'])
def download_submission(submission_id):
    """
    Download the file associated with a submission.
    No authentication required for downloads (public access by submission ID).
    """
    submission = Submission.query.get_or_404(submission_id)
    
    if not submission.file_path:
        return jsonify({'error': 'File path not found'}), 404
    
    # Reconstruct full path
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], submission.file_path)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404
    
    # Send file with original filename and mime type
    return send_file(
        file_path,
        as_attachment=True,
        download_name=submission.filename,
        mimetype=submission.mime_type
    )

# --- Debug Endpoints ---

@api.route('/debug/file-info', methods=['POST'])
def debug_file_info():
    """
    Debug endpoint to test file information extraction.
    Accepts a file upload and returns metadata extracted by ffprobe/Pillow.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Save temporarily
    try:
        file_path, original_filename = save_file(file, current_app.config['UPLOAD_FOLDER'])
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    
    try:
        # Extract file info
        info = get_file_info(file_path, file.mimetype)
        info['originalFilename'] = original_filename
        
        return jsonify(info)
    finally:
        # Cleanup temporary file
        delete_file(file_path)
