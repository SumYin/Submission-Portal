// Shared types for the Submission Portal front-end. These mirror the backend contract.
// When wiring a Python backend later, keep the shapes compatible with these interfaces.

export type UserId = string
export type FormId = string
export type SubmissionId = string

export interface User {
  id: UserId
  username: string
  email?: string
}

export interface Profile {
  name?: string
  description?: string
  email?: string
  phone?: string
}

export type FileType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "video/mp4"
  | "video/quicktime" // .mov
  | string // allow custom types

export interface VideoConstraints {
  minFrameRate?: number
  maxFrameRate?: number
  allowedCodecs?: string[]
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  // Additional video constraints for richer validation (backend to enforce)
  allowedAspectRatios?: string[] // e.g., ["16:9","4:3","1:1","9:16"]
  minBitrateKbps?: number
  maxBitrateKbps?: number
  minFrames?: number
  maxFrames?: number
  audio?: {
    allowedCodecs?: string[] // e.g., ["aac","mp3","flac","wav","opus"]
    allowedChannels?: string[] // e.g., ["mono","stereo","5.1"]
    minSampleRateHz?: number
    maxSampleRateHz?: number
    minBitrateKbps?: number
    maxBitrateKbps?: number
  }
}

export interface ImageConstraints {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface FileConstraints {
  minSizeBytes?: number
  maxSizeBytes?: number
  allowedTypes?: FileType[] // MIME types
  allowedExtensions?: string[] // e.g. [".txt", ".md", ".py"]
  allowAllTypes?: boolean // when true, do not restrict by type/extension
  image?: ImageConstraints
  video?: VideoConstraints
}

export interface FormSpec {
  title: string
  description?: string
  code: string // public invitation code used to submit
  constraints: FileConstraints
  allowMultipleSubmissionsPerUser?: boolean
  maxSubmissionsPerUser?: number
  opensAt?: string // ISO timestamp
  closesAt?: string // ISO timestamp (deadline)
  createdAt: string // ISO
  createdBy: UserId
}

export interface Form extends FormSpec {
  id: FormId
}

export type SubmissionStatus = "processing" | "accepted" | "rejected"

export interface Submission {
  id: SubmissionId
  formId: FormId
  submittedBy?: UserId | null // allow guest submissions if desired
  status: SubmissionStatus
  filename: string
  sizeBytes: number
  mimeType: string
  createdAt: string // ISO
  failureReasons?: string[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  code: string
  message: string
}
