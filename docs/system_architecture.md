# System Architecture & Developer Guide

This document explains how the Submission Portal works, how data flows through the system, and how the different components interact. It is written for developers who are new to the project.

## 1. System Overview

The Submission Portal is a web application that allows users to create forms for collecting media files (Videos, Images, Audio) from other users. It enforces strict constraints on the uploaded files (e.g., resolution, bitrate, codec) to ensure quality and compatibility.

The system consists of two main parts:
1.  **Frontend**: A Next.js (React) application that provides the user interface.
2.  **Backend**: A Flask (Python) application that handles logic, database interactions, and file validation.

## 2. Key Features

-   **User Accounts**: Users can sign up, log in, and manage their profile.
-   **Form Builder**: Users can create submission forms with specific constraints (e.g., "Video must be MP4, 1080p, max 100MB").
-   **File Submission**: Submitters use a unique code to access a form and upload files.
-   **Validation**: The backend rigorously checks uploaded files using `ffprobe` (for media) and `Pillow` (for images) to ensure they meet the form's constraints.
-   **Dashboard**: Form creators can view and download submissions.

## 3. Data Flow

### 3.1. Submission Flow
1.  **Upload**: A user selects a file on the frontend. The file is sent to the backend via a `POST /api/submit/{code}` request.
2.  **Storage**: The backend receives the file and saves it temporarily to a local `uploads` folder.
3.  **Validation**:
    -   The backend looks up the Form associated with the code.
    -   It retrieves the `constraints` (JSON) defined for that form.
    -   It runs a validation function (using `ffprobe` or `Pillow`) to extract metadata from the file.
    -   It compares the metadata against the constraints.
4.  **Result**:
    -   **Pass**: The file is kept, a `Submission` record is created in the database with status `accepted`, and metadata is stored.
    -   **Fail**: The file is deleted (or marked rejected), and the user receives an error message.

### 3.2. Authentication Flow
1.  **Login**: User sends credentials to `/api/auth/signin`.
2.  **Session**: The backend verifies credentials and establishes a session (using Flask-Login).
3.  **State**: The frontend updates its state to reflect the logged-in user.

## 4. Backend Components (Flask)

The backend is organized into several modules:

### `app.py`
The entry point. It initializes the Flask app, connects to the database, and registers the routes.

### `models.py`
Defines the database structure (Schema).
-   **User**: Stores username, email, password hash.
-   **Form**: Stores form details and `constraints` (JSON).
-   **Submission**: Stores metadata about uploaded files (filename, size, status).

### `routes.py`
Defines the API endpoints (URLs) that the frontend can call.
-   `POST /auth/signup`: Create a new account.
-   `POST /forms`: Create a new form.
-   `POST /submit/{code}`: Upload a file for a specific form.

### `validation.py`
Contains the logic for checking files.
-   `validate_video(path, constraints)`: Runs `ffprobe`, parses output, checks against constraints.
-   `validate_image(path, constraints)`: Opens image with Pillow, checks dimensions/format.

## 5. Database Schema (Simplified)

We use SQLite. The main tables are:

-   **users**: `id`, `username`, `password_hash`
-   **forms**: `id`, `creator_id`, `title`, `constraints` (JSON blob)
-   **submissions**: `id`, `form_id`, `filename`, `status`

*Note: Constraints are stored as JSON to allow flexibility for different file types without creating dozens of complex tables.*
