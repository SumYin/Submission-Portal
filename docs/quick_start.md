# Quick Start & Deployment Guide

This guide covers how to set up the Submission Portal for local development, LAN hosting, and cloud deployment.

## Prerequisites

1.  **Python 3.8+**: [Download Python](https://www.python.org/downloads/)
2.  **Node.js 18+**: [Download Node.js](https://nodejs.org/)
3.  **FFmpeg (Essential)**: Required for video/audio validation.

### Installing FFmpeg (Windows)

1.  Go to the [BtbN FFmpeg Builds](https://github.com/BtbN/FFmpeg-Builds/releases).
2.  Download the `ffmpeg-master-latest-win64-gpl.zip` file.
3.  Extract the zip file.
4.  Copy the path to the `bin` folder (e.g., `C:\ffmpeg\bin`).
5.  Add this path to your System Environment Variables (Path).
6.  Open a new terminal and type `ffprobe -version` to verify.

## 1. Local Development (Single Machine)

### Backend
1.  Navigate to `backend`:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Run the server:
    ```bash
    python app.py
    ```
    Server runs at `http://localhost:5000`.

### Frontend
1.  Navigate to `web`:
    ```bash
    cd web
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the dev server:
    ```bash
    npm run dev
    ```
    App runs at `http://localhost:3000`.

## 2. LAN Hosting (Accessible on Network)

To let others on your WiFi/Network access the portal:

1.  **Find your IP Address**: Run `ipconfig` (Windows) and note your IPv4 Address (e.g., `192.168.1.15`).
2.  **Backend**:
    -   The Flask app needs to listen on all interfaces.
    -   Run: `python app.py` (Ensure `app.run(host='0.0.0.0')` is set in code).
3.  **Frontend**:
    -   Update `.env.local` in `web/` to point to your IP:
        ```
        NEXT_PUBLIC_API_BASE_URL=http://192.168.1.15:5000
        ```
    -   Run Next.js exposing the host:
        ```bash
        npm run dev -- -H 0.0.0.0
        ```
4.  **Access**: Users can now visit `http://192.168.1.15:3000`.

## 3. Cloud Hosting (VPS/PaaS)

### Backend
-   Deploy the `backend` folder to a Python host (Heroku, Render, DigitalOcean App Platform, or a VPS).
-   **Environment Variables**:
    -   `SECRET_KEY`: Set a strong random string.
    -   `DATABASE_URI`: Path to SQLite file (or switch to PostgreSQL for production).
-   **FFmpeg**: Ensure the host environment has `ffmpeg` installed (most PaaS offer buildpacks for this).

### Frontend
-   Deploy the `web` folder to a frontend host (Vercel, Netlify).
-   **Environment Variables**:
    -   `NEXT_PUBLIC_API_BASE_URL`: The URL of your deployed backend (e.g., `https://my-api.onrender.com`).

## 4. Switching to Real Backend

The frontend currently defaults to a **Mock API** for testing. To use the real Flask backend:

1.  Create or edit `web/.env.local`.
2.  Add:
    ```bash
    NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
    ```
    (Or your LAN IP / Cloud URL).
3.  Restart the frontend server.
4.  Visit `/debug` on the website to confirm the connection.
