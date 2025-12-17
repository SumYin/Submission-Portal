import os
import uuid
import hashlib
from werkzeug.utils import secure_filename

def save_file(file, upload_folder):
    """
    Saves a file to the upload folder using its SHA-256 hash as the filename.
    Returns (relative_path, original_filename, is_new).
    """
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    # Calculate SHA-256 hash
    sha256_hash = hashlib.sha256()
    
    # Read file in chunks to avoid memory issues
    chunk_size = 4096
    while True:
        chunk = file.read(chunk_size)
        if not chunk:
            break
        sha256_hash.update(chunk)
    
    # Reset file pointer
    file.seek(0)
    
    file_hash = sha256_hash.hexdigest()
    original_filename = secure_filename(file.filename)
    
    # The saved filename is the hash
    saved_filename = file_hash
    file_path = os.path.join(upload_folder, saved_filename)
    
    is_new = False
    # Check if file already exists
    if not os.path.exists(file_path):
        file.save(file_path)
        is_new = True
        
    return saved_filename, original_filename, is_new

def delete_file(file_path):
    """
    Deletes a file from the filesystem.
    """
    if os.path.exists(file_path):
        os.remove(file_path)
