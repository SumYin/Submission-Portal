# SQLite schema (3NF) for Submission Portal

This schema supports a guided form builder for exactly one of four categories (Video, Image, Audio, Other) and validates uploads using reliably detectable metadata (Python stdlib + ffprobe for media; Pillow for images).

Highlights:
- Forms specify a single `file_category` and common file size bounds (capped at 100 MB).
- Type-specific constraints live in separate tables: `video_constraints`, `image_constraints`, `audio_constraints`.
- Allowed formats are normalized via a master `file_formats` table and a join `form_allowed_formats`; arbitrary extensions are supported via `form_allowed_extensions` for the "Other" category (and optional extras for any category).
- Submissions and per-type metadata tables capture extracted properties for audit and re-validation.

See `db-schema.sql` for the full DDL.

## Tables (overview)

- users(id, username, email, created_at)
- forms(id, code, title, description, created_by, created_at, updated_at, opens_at, closes_at, file_category, min_size_bytes, max_size_bytes, allow_multiple_submissions_per_user, max_submissions_per_user)
- file_formats(id, category, extension, mime_type, description)
- form_allowed_formats(form_id, format_id)
- form_allowed_extensions(form_id, extension)
- image_constraints(form_id, min/max width/height)
- video_constraints(form_id, min/max fps, min/max width/height, min/max bitrate, length mode: duration or frames; min/max duration or frames)
- video_allowed_codecs(form_id, codec)
- video_allowed_aspect_ratios(form_id, aspect_ratio)
- audio_constraints(form_id, min/max duration, min/max bitrate, min/max sample rate)
- audio_allowed_codecs(form_id, codec)
- audio_allowed_channels(form_id, channels)
- submissions(id, form_id, submitted_by, filename, mime_type, size_bytes, status, created_at)
- video_metadata(submission_id, width, height, fps, frames, duration_sec, bitrate_kbps, codec_name, aspect_ratio, audio_* columns)
- image_metadata(submission_id, width, height, color_profile)
- audio_metadata(submission_id, duration_sec, sample_rate_hz, bitrate_kbps, channels, codec_name)
- submission_validation_results(id, submission_id, passed, message, created_at)

This structure satisfies 3NF:
- Each non-key attribute depends on the whole key and nothing but the key.
- Many-to-many relationships (forms ↔ formats/codecs/aspect ratios) are resolved via join tables.
- Type-specific attributes are in separate tables keyed by `form_id` (and by `submission_id` for extracted metadata) to avoid null-heavy wide tables.

## Detection plan (Python backend)

- File size: `os.stat(path).st_size` (always available).
- Images: Pillow (PIL) to get width/height; optionally EXIF/DPI. Alternatively, `ffprobe -show_streams` works too for many image formats.
- Audio/Video: `ffprobe -v error -print_format json -show_format -show_streams <file>` and parse JSON.
  - FPS: derive from `r_frame_rate` or `avg_frame_rate`.
  - Resolution: `width` and `height` in the video stream.
  - Frames: `nb_frames` (may be missing; fallback: `ffprobe -count_frames -select_streams v:0 -show_streams`).
  - Duration: `format.duration` or per-stream `duration`.
  - Bitrate: `bit_rate` in stream; audio sample rate in `sample_rate`; channels via `channels`.
  - Codec names: `codec_name` for audio/video.

Reject files when required fields are missing/corrupted; record a `submission_validation_results` row with an explanatory message.

## "Other" extensions and normalization

For "Other" (and for edge cases in any category), use `form_allowed_extensions` to store an explicit list of dot-prefixed extensions. This table is in 3NF because the (form_id, extension) composite key fully determines the row, and no non-key attribute depends on a proper subset of the key. You can optionally pre-populate `file_formats` for common types and use `form_allowed_formats` instead.

## Indices and constraints (recommended)

- Index `submissions(form_id)`
- Index `submissions(submitted_by)`
- Index `form_allowed_extensions(form_id)`
- Index `form_allowed_formats(form_id)`
- Consider partial indices on constraints tables if you filter by ranges frequently.

## Seed examples

- file_formats:
  - (image, .png, image/png)
  - (image, .jpg, image/jpeg)
  - (video, .mp4, video/mp4)
  - (video, .mov, video/quicktime)
  - (audio, .mp3, audio/mpeg)
  - (audio, .wav, audio/wav)

## Migration notes

- Existing mock frontend stores a `constraints` object; your API layer should map that into these tables.
- Enforce `max_size_bytes <= 100MB` in API/DB.
- Store `file_category` on the form to drive type-specific UI and validation.
