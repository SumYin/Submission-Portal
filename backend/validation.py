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

def validate_submission(file_path, mime_type, constraints, original_filename=None):
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


    metadata = {}


    custom_extensions = constraints.get('customExtensions', [])
    if custom_extensions:
        if not original_filename:
             return False, "Original filename required for extension validation", {}

        allowed_exts = [ext.lower() if ext.startswith('.') else f'.{ext.lower()}' for ext in custom_extensions]
        _, file_ext = os.path.splitext(original_filename)
        
        if file_ext.lower() not in allowed_exts:

             return False, f"Extension {file_ext} not allowed. Allowed: {', '.join(allowed_exts)}", {}

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

    elif mime_type.startswith('audio/'):
        raw_meta, error = get_video_metadata(file_path)  # ffprobe works for audio too
        if error:
            return False, f"Invalid audio file: {error}", {}
        
        # Extract audio stream
        audio_stream = next((s for s in raw_meta.get('streams', []) if s['codec_type'] == 'audio'), None)
        if not audio_stream:
            return False, "No audio stream found", {}
        
        codec = audio_stream.get('codec_name')
        sample_rate = int(audio_stream.get('sample_rate', 0))
        channels = int(audio_stream.get('channels', 0))
        duration = float(raw_meta.get('format', {}).get('duration', 0))
        bit_rate = audio_stream.get('bit_rate')
        
        metadata = {
            'codec': codec,
            'sampleRate': sample_rate,
            'channels': channels,
            'duration': duration,
            'bitRate': bit_rate,
            'raw': raw_meta
        }
        
        audio_constraints = constraints.get('audio', {})
        
        # Check allowed codecs
        if audio_constraints.get('allowedCodecs'):
            if codec not in audio_constraints['allowedCodecs']:
                return False, f"Codec {codec} not allowed", metadata
        
        # Check duration
        if audio_constraints.get('minDurationSec') and duration < audio_constraints['minDurationSec']:
            return False, f"Duration {duration}s < min {audio_constraints['minDurationSec']}s", metadata
        if audio_constraints.get('maxDurationSec') and duration > audio_constraints['maxDurationSec']:
            return False, f"Duration {duration}s > max {audio_constraints['maxDurationSec']}s", metadata
        
        # Channels check removed as per user request

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
            
            # Extract specific video stream info
            video_stream = next((s for s in raw_meta.get('streams', []) if s['codec_type'] == 'video'), None)
            if video_stream:
                info['video'] = {
                    'bitRate': video_stream.get('bit_rate'),
                    'codec': video_stream.get('codec_name'),
                    'frameRate': video_stream.get('r_frame_rate'),
                    'height': int(video_stream.get('height', 0)),
                    'width': int(video_stream.get('width', 0))
                }
            
            # Extract format info
            fmt = raw_meta.get('format', {})
            info['bitRate'] = fmt.get('bit_rate')
            info['duration'] = float(fmt.get('duration', 0)) if fmt.get('duration') else 0
            info['format'] = fmt.get('format_name')
            
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
    
    # Try audio metadata with ffprobe
    elif mime_type.startswith('audio/'):
        raw_meta, error = get_video_metadata(file_path)  # ffprobe works for audio too
        if not error and raw_meta:
            info['tools'].append('ffprobe')
            
            # Extract specific audio stream info
            audio_stream = next((s for s in raw_meta.get('streams', []) if s['codec_type'] == 'audio'), None)
            if audio_stream:
                info['audio'] = {
                    'bitRate': audio_stream.get('bit_rate'),
                    'codec': audio_stream.get('codec_name'),
                    'sampleRate': int(audio_stream.get('sample_rate', 0)),
                    'channels': int(audio_stream.get('channels', 0))
                }
            
            # Extract format info
            fmt = raw_meta.get('format', {})
            info['bitRate'] = fmt.get('bit_rate')
            info['duration'] = float(fmt.get('duration', 0)) if fmt.get('duration') else 0
            info['format'] = fmt.get('format_name')
            
        else:
            info['error'] = error
    
    else:
        info['message'] = 'File type not recognized as video, audio, or image. Only basic info available.'
    
    return info
