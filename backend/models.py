from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    display_name = db.Column(db.String(128))
    bio = db.Column(db.Text)
    is_deleted = db.Column(db.Boolean, default=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'displayName': self.display_name,
            'bio': self.bio,
            'isDeleted': self.is_deleted
        }

class Form(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(128))
    description = db.Column(db.Text)
    code = db.Column(db.String(10), unique=True, index=True)
    constraints = db.Column(db.JSON)  # Storing constraints as JSON
    allow_multiple_submissions = db.Column(db.Boolean, default=False)
    max_submissions = db.Column(db.Integer, default=1)
    opens_at = db.Column(db.DateTime, nullable=True)
    closes_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(36), db.ForeignKey('user.id'))

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'code': self.code,
            'constraints': self.constraints,
            'allowMultipleSubmissionsPerUser': self.allow_multiple_submissions,
            'maxSubmissionsPerUser': self.max_submissions,
            'opensAt': self.opens_at.isoformat() if self.opens_at else None,
            'closesAt': self.closes_at.isoformat() if self.closes_at else None,
            'createdAt': self.created_at.isoformat(),
            'createdBy': self.created_by
        }

class Submission(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    form_id = db.Column(db.String(36), db.ForeignKey('form.id'))
    submitted_by = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.String(20), default='processing') # processing, accepted, rejected
    filename = db.Column(db.String(256))
    file_path = db.Column(db.String(512))  # Relative path to the uploaded file
    size_bytes = db.Column(db.Integer)
    mime_type = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Metadata extracted from file (stored as JSON for flexibility)
    metadata_json = db.Column(db.JSON, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'formId': self.form_id,
            'submittedBy': self.submitted_by,
            'status': self.status,
            'filename': self.filename,
            'filePath': self.file_path,
            'sizeBytes': self.size_bytes,
            'mimeType': self.mime_type,
            'createdAt': self.created_at.isoformat(),
            'metadata': self.metadata_json
        }

class SubmissionValidationResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.String(36), db.ForeignKey('submission.id'))
    passed = db.Column(db.Boolean)
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
