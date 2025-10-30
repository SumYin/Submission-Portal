from __future__ import annotations

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    app_name: str = Field(default="Submission Portal API", alias="APP_NAME")
    env: str = Field(default="dev", alias="ENV")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    database_url: str = Field(default="sqlite:///./data.db", alias="DATABASE_URL")

    secret_key: str = Field(default="change-me-in-production", alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=60 * 24 * 7, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    storage_dir: str = Field(default="./storage", alias="STORAGE_DIR")
    max_upload_bytes: int = Field(default=104857600, alias="MAX_UPLOAD_BYTES")  # 100 MB

    cors_allow_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"], alias="CORS_ALLOW_ORIGINS")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.storage_dir, exist_ok=True)
