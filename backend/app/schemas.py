from __future__ import annotations

from typing import List, Optional, Generic, TypeVar
from pydantic import BaseModel, Field


# Auth
class SignUpIn(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class SignInIn(BaseModel):
    username: str
    password: str


# Core types mirrored from frontend
UserId = str
FormId = str
SubmissionId = str


class User(BaseModel):
    id: UserId
    username: str
    email: Optional[str] = None


class Profile(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


# Constraints (using camelCase to match frontend JSON)
class ImageConstraints(BaseModel):
    minWidth: Optional[int] = None
    minHeight: Optional[int] = None
    maxWidth: Optional[int] = None
    maxHeight: Optional[int] = None


class VideoAudioSubConstraints(BaseModel):
    allowedCodecs: Optional[List[str]] = None
    allowedChannels: Optional[List[str]] = None
    minSampleRateHz: Optional[int] = None
    maxSampleRateHz: Optional[int] = None
    minBitrateKbps: Optional[int] = None
    maxBitrateKbps: Optional[int] = None


class VideoConstraints(BaseModel):
    minFrameRate: Optional[float] = None
    maxFrameRate: Optional[float] = None
    allowedCodecs: Optional[List[str]] = None
    minWidth: Optional[int] = None
    minHeight: Optional[int] = None
    maxWidth: Optional[int] = None
    maxHeight: Optional[int] = None
    allowedAspectRatios: Optional[List[str]] = None
    minBitrateKbps: Optional[int] = None
    maxBitrateKbps: Optional[int] = None
    minFrames: Optional[int] = None
    maxFrames: Optional[int] = None
    minDurationSec: Optional[float] = None
    maxDurationSec: Optional[float] = None
    audio: Optional[VideoAudioSubConstraints] = None


class AudioConstraints(BaseModel):
    minDurationSec: Optional[float] = None
    maxDurationSec: Optional[float] = None
    minSampleRateHz: Optional[int] = None
    maxSampleRateHz: Optional[int] = None
    minBitrateKbps: Optional[int] = None
    maxBitrateKbps: Optional[int] = None
    allowedCodecs: Optional[List[str]] = None
    allowedChannels: Optional[List[str]] = None


class FileConstraints(BaseModel):
    minSizeBytes: Optional[int] = None
    maxSizeBytes: Optional[int] = None
    allowedTypes: Optional[List[str]] = None
    allowedExtensions: Optional[List[str]] = None
    allowAllTypes: Optional[bool] = None
    image: Optional[ImageConstraints] = None
    video: Optional[VideoConstraints] = None
    audio: Optional[AudioConstraints] = None


class FormSpec(BaseModel):
    title: str
    description: Optional[str] = None
    code: str
    constraints: FileConstraints
    allowMultipleSubmissionsPerUser: Optional[bool] = None
    maxSubmissionsPerUser: Optional[int] = None
    opensAt: Optional[str] = None
    closesAt: Optional[str] = None
    createdAt: str
    createdBy: UserId


class Form(BaseModel):
    id: FormId
    title: str
    description: Optional[str] = None
    code: str
    constraints: FileConstraints
    allowMultipleSubmissionsPerUser: Optional[bool] = None
    maxSubmissionsPerUser: Optional[int] = None
    opensAt: Optional[str] = None
    closesAt: Optional[str] = None
    createdAt: str
    createdBy: UserId


SubmissionStatus = str  # "processing" | "accepted" | "rejected"


class Submission(BaseModel):
    id: SubmissionId
    formId: FormId
    submittedBy: Optional[UserId] = None
    status: SubmissionStatus
    filename: str
    sizeBytes: int
    mimeType: str
    createdAt: str
    failureReasons: Optional[List[str]] = None


T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    pageSize: int


# API helper shapes
class CreateFormIn(BaseModel):
    title: str
    description: Optional[str] = None
    code: Optional[str] = None
    constraints: FileConstraints
    allowMultipleSubmissionsPerUser: Optional[bool] = None
    maxSubmissionsPerUser: Optional[int] = None
    opensAt: Optional[str] = None
    closesAt: Optional[str] = None


class UpdateFormIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    constraints: Optional[FileConstraints] = None
    allowMultipleSubmissionsPerUser: Optional[bool] = None
    maxSubmissionsPerUser: Optional[int] = None
    opensAt: Optional[str] = None
    closesAt: Optional[str] = None


class UploadJsonIn(BaseModel):
    filename: str
    sizeBytes: int
    mimeType: str = ""


class UploadResult(BaseModel):
    ok: bool
    submission: Optional[Submission] = None
    errors: Optional[List[str]] = None
