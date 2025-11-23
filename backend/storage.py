import os
import uuid
from werkzeug.utils import secure_filename

def save_file(file, upload_folder):
    """
    Saves a file to the upload folder with a unique name.
    Returns the absolute path to the saved file.
    """
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    original_filename = secure_filename(file.filename)
    extension = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(upload_folder, unique_filename)
    
    file.save(file_path)
    return file_path, original_filename

def delete_file(file_path):
    """
    Deletes a file from the filesystem.
    """
    if os.path.exists(file_path):
        os.remove(file_path)
