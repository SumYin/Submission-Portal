import os
import json
import subprocess
from PIL import Image

def get_video_metadata(file_path):
    """
    Uses ffprobe to extract metadata from a video file.
    """
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            file_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            return None, f"FFprobe error: {result.stderr}"
        
        data = json.loads(result.stdout)
        return data, None
    except Exception as e:
        return None, str(e)

def validate_submission(file_path, mime_type, constraints):
    """
    Validates a file against the given constraints.
    Returns (passed: bool, message: str, metadata: dict).
    """
    file_size = os.path.getsize(file_path)
    
    # 1. Size Check
    if constraints.get('minSizeBytes') and file_size < constraints['minSizeBytes']:
        return False, f"File too small (min {constraints['minSizeBytes']} bytes)", {}
    if constraints.get('maxSizeBytes') and file_size > constraints['maxSizeBytes']:
        return False, f"File too large (max {constraints['maxSizeBytes']} bytes)", {}

    # 2. Type Check (Basic MIME)
    # Note: Real validation should rely on content inspection, not just MIME from client.
    # For now, we trust the extension/mime check done by frontend but verify with tools below.

    metadata = {}

    # 3. Media Validation
    if mime_type.startswith('video/'):
        raw_meta, error = get_video_metadata(file_path)
        if error:
            return False, f"Invalid video file: {error}", {}
        
        # Extract useful meta
        video_stream = next((s for s in raw_meta.get('streams', []) if s['codec_type'] == 'video'), None)
        if not video_stream:
            return False, "No video stream found", {}
        
        width = int(video_stream.get('width', 0))
        height = int(video_stream.get('height', 0))
        duration = float(raw_meta.get('format', {}).get('duration', 0))
        
        metadata = {
            'width': width,
            'height': height,
            'duration': duration,
            'codec': video_stream.get('codec_name'),
            'raw': raw_meta
        }

        video_constraints = constraints.get('video', {})
        
        if video_constraints.get('minWidth') and width < video_constraints['minWidth']:
            return False, f"Width {width} < min {video_constraints['minWidth']}", metadata
        if video_constraints.get('minHeight') and height < video_constraints['minHeight']:
            return False, f"Height {height} < min {video_constraints['minHeight']}", metadata
        if video_constraints.get('maxDurationSec') and duration > video_constraints['maxDurationSec']:
            return False, f"Duration {duration}s > max {video_constraints['maxDurationSec']}s", metadata

    elif mime_type.startswith('image/'):
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                metadata = {'width': width, 'height': height, 'format': img.format}
                
                image_constraints = constraints.get('image', {})
                if image_constraints.get('minWidth') and width < image_constraints['minWidth']:
                    return False, f"Width {width} < min {image_constraints['minWidth']}", metadata
                if image_constraints.get('maxWidth') and width > image_constraints['maxWidth']:
                    return False, f"Width {width} > max {image_constraints['maxWidth']}", metadata
                if image_constraints.get('minHeight') and height < image_constraints['minHeight']:
                    return False, f"Height {height} < min {image_constraints['minHeight']}", metadata
                if image_constraints.get('maxHeight') and height > image_constraints['maxHeight']:
                    return False, f"Height {height} > max {image_constraints['maxHeight']}", metadata
        except Exception as e:
            return False, f"Invalid image: {str(e)}", {}

    return True, "Valid", metadata

def get_file_info(file_path, mime_type):
    """
    Extracts comprehensive information from a file for debugging purposes.
    Returns dict with file info and the tool used to extract it.
    """
    info = {
        'fileSize': os.path.getsize(file_path),
        'mimeType': mime_type,
        'tools': []
    }
    
    # Try video metadata with ffprobe
    if mime_type.startswith('video/'):
        raw_meta, error = get_video_metadata(file_path)
        if not error and raw_meta:
            info['tools'].append('ffprobe')
            video_stream = next((s for s in raw_meta.get('streams', []) if s['codec_type'] == 'video'), None)
            if video_stream:
                info['video'] = {
                    'width': int(video_stream.get('width', 0)),
                    'height': int(video_stream.get('height', 0)),
                    'codec': video_stream.get('codec_name'),
                    'bitRate': video_stream.get('bit_rate'),
                    'frameRate': video_stream.get('r_frame_rate')
                }
            if 'format' in raw_meta:
                info['duration'] = float(raw_meta['format'].get('duration', 0))
                info['bitRate'] = raw_meta['format'].get('bit_rate')
                info['format'] = raw_meta['format'].get('format_name')
        else:
            info['error'] = error
    
    # Try image metadata with Pillow
    elif mime_type.startswith('image/'):
        try:
            with Image.open(file_path) as img:
                info['tools'].append('Pillow')
                info['image'] = {
                    'width': img.size[0],
                    'height': img.size[1],
                    'format': img.format,
                    'mode': img.mode
                }
                # Get additional EXIF data if available
                if hasattr(img, '_getexif') and img._getexif():
                    info['hasExif'] = True
        except Exception as e:
            info['error'] = str(e)
    
    else:
        info['message'] = 'File type not recognized as video or image. Only basic info available.'
    
    return info
