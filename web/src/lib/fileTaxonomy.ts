// File categories and helper utilities for building allowed types lists
// This is UI-facing; backend validation should use the resulting MIME types and/or extensions in FormSpec.constraints

export const FILE_CATEGORIES = [
  {
    id: "images",
    label: "Images",
    mimes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    id: "video",
    label: "Video",
    mimes: ["video/mp4", "video/quicktime"],
  },
  {
    id: "audio",
    label: "Audio",
    mimes: [
      "audio/mpeg", // mp3
      "audio/aac",
      "audio/wav",
      "audio/flac",
      "audio/ogg",
      "audio/mp4",
    ],
  },
  {
    id: "text",
    label: "Text",
    mimes: ["text/plain", "text/markdown"],
  },
  {
    id: "archives",
    label: "Archives",
    // Extensions better for archives; include mimes for accept
    mimes: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/gzip", "application/x-tar"],
  },
] as const

export type FileCategoryId = typeof FILE_CATEGORIES[number]["id"]

export function mimesForCategories(categories: FileCategoryId[]): string[] {
  const set = new Set<string>()
  for (const cat of categories) {
    const found = FILE_CATEGORIES.find((c) => c.id === cat)
    if (found) for (const m of found.mimes) set.add(m)
  }
  return Array.from(set)
}

export const VIDEO_CODECS = ["h264", "hevc", "vp9", "av1"] as const
export const AUDIO_CODECS = ["aac", "mp3", "flac", "wav", "opus"] as const
export const AUDIO_CHANNELS = ["mono", "stereo", "5.1"] as const
export const ASPECT_RATIOS = ["16:9", "4:3", "1:1", "9:16"] as const
