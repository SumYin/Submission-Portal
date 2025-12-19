from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from models import db, Form, Submission, SubmissionValidationResult, User
from storage import save_file, delete_file
from validation import validate_submission, get_file_info
import uuid
import os
import shutil
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


@api.route('/api/reset', methods=['POST'])
def reset_system():
    """
    Reset the entire system:
    - Delete all files in uploads folder
    - Drop and recreate database tables
    - Reinitialize upload folder
    """
    try:
        # 1. Delete all files in uploads folder
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if os.path.exists(upload_folder):
            shutil.rmtree(upload_folder)
        
        # 2. Drop all tables and recreate them
        db.drop_all()
        db.create_all()
        
        # 3. Recreate upload folder
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        
        return jsonify({
            'success': True,
            'message': 'System reset complete. All data cleared and database reinitialized.'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Reset failed: {str(e)}'
        }), 500


@api.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get basic user information by ID"""
    user = User.query.get_or_404(user_id)
    return jsonify({'id': user.id, 'username': user.username})

@api.route('/users/<user_id>/profile', methods=['GET'])
def get_user_profile(user_id):
    user = User.query.get_or_404(user_id)
    if user.is_deleted:
        return jsonify({'name': 'Deleted User', 'displayName': 'Deleted User', 'bio': ''})
    return jsonify({
        'name': user.username, 
        'displayName': user.display_name or user.username,
        'bio': user.bio,
        'email': user.email # Consider hiding this for public profiles? Keeping for now as per existing code
    })

@api.route('/me/profile', methods=['GET'])
@login_required
def get_my_profile():
    """Get the current user's profile"""
    return jsonify({
        'name': current_user.username, 
        'email': current_user.email,
        'displayName': current_user.display_name,
        'bio': current_user.bio
    })

@api.route('/me/profile', methods=['PATCH'])
@login_required
def update_my_profile():
    """Update the current user's profile"""
    data = request.get_json()
    
    # Update allowed fields
    if 'displayName' in data:
        current_user.display_name = data['displayName']
        
    if 'bio' in data:
        current_user.bio = data['bio']
    
    if 'email' in data:
        # Check if email is already taken by another user
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != current_user.id:
            return jsonify({'error': 'Email already taken'}), 400
        current_user.email = data['email']
    
    db.session.commit()
    return jsonify({
        'name': current_user.username, 
        'email': current_user.email,
        'displayName': current_user.display_name,
        'bio': current_user.bio
    })

@api.route('/me', methods=['DELETE'])
@login_required
def delete_my_account():
    """
    Delete the current user's account.
    Clears personal info, renames username, marks as deleted.
    """
    from flask_login import logout_user
    
    # 1. Clear info
    current_user.display_name = None
    current_user.bio = None

    current_user.email = None 
    current_user.password_hash = "deleted" # Scramble password
    

    current_user.username = f"deletedaccount_{current_user.id}"
    
    current_user.is_deleted = True
    
    db.session.commit()
    logout_user()
    return '', 204

# --- Forms ---

@api.route('/forms', methods=['POST'])
@login_required
def create_form():
    data = request.get_json()
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

            
            # Count how many submissions use this file
            usage_count = Submission.query.filter_by(file_path=submission.file_path).count()
            

            
            other_uses = Submission.query.filter(
                Submission.file_path == submission.file_path,
                Submission.form_id != form_id
            ).count()
            
            if other_uses == 0:
                pass

    files_to_check = set(s.file_path for s in submissions if s.file_path)
    
    for submission in submissions:
        db.session.delete(submission)
    
    # Delete the form
    db.session.delete(form)
    db.session.commit()
    
    # Now check if files are still used
    for relative_path in files_to_check:
        if not relative_path: continue
        
        usage_count = Submission.query.filter_by(file_path=relative_path).count()
        if usage_count == 0:
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)
            delete_file(file_path)
    
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

    # Save temporarily (or permanently if deduplicated)
    try:
        # save_file now returns (relative_path_hash, original_filename, is_new)
        saved_filename, original_filename, is_new = save_file(file, current_app.config['UPLOAD_FOLDER'])
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], saved_filename)
    except Exception as e:
        return jsonify({'ok': False, 'errors': [f'Upload failed: {str(e)}']}), 500

    # Validate
    # We pass original_filename for extension validation
    passed, message, metadata = validate_submission(file_path, file.mimetype, form.constraints or {}, original_filename=original_filename)

    if not passed:
        # Only delete if it was a NEW file. If it was existing (deduplicated), don't delete!
        if is_new:
            delete_file(file_path) 
        return jsonify({'ok': False, 'errors': [message]})

    # Create Submission Record
    # Store the hash as file_path
    submission = Submission(
        id=str(uuid.uuid4()),
        form_id=form.id,
        submitted_by=current_user.id if current_user.is_authenticated else None,
        status='accepted',
        filename=original_filename,
        file_path=saved_filename,
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
    
    # Delete associated file ONLY if no other submission uses it
    if submission.file_path:

        file_path_to_check = submission.file_path
        
        db.session.delete(submission)
        db.session.commit()
        
        # Check if any other submission uses this file
        usage_count = Submission.query.filter_by(file_path=file_path_to_check).count()
        if usage_count == 0:
            full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path_to_check)
            delete_file(full_path)
    else:
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
        saved_filename, original_filename, is_new = save_file(file, current_app.config['UPLOAD_FOLDER'])
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], saved_filename)
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    
    try:
        # Extract file info
        info = get_file_info(file_path, file.mimetype)
        info['originalFilename'] = original_filename
        
        return jsonify(info)
    finally:
        # Cleanup temporary file ONLY if it was new
        if is_new:
            delete_file(file_path)
