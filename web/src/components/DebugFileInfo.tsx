"use client"

import { useState } from "react"
import { uploadFileForDebugInfo } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export default function DebugFileInfo() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [info, setInfo] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null
        setFile(selectedFile)
        setInfo(null)
        setError(null)
    }

    const handleAnalyze = async () => {
        if (!file) return

        setLoading(true)
        setError(null)
        try {
            const result = await uploadFileForDebugInfo(file)
            setInfo(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="p-4 border rounded bg-gray-50 dark:bg-gray-900">
            <h2 className="font-semibold mb-3">File Information Extraction Test</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload a file to test ffprobe (video) and Pillow (image) metadata extraction.
            </p>

            <div className="space-y-4">
                {/* File Upload */}
                <div className="flex items-center gap-3">
                    <label className="flex-1">
                        <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">
                                {file ? file.name : "Choose a file..."}
                            </span>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,video/*,audio/*"
                        />
                    </label>
                    <Button
                        onClick={handleAnalyze}
                        disabled={!file || loading}
                        size="sm"
                    >
                        {loading ? "Analyzing..." : "Analyze File"}
                    </Button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Results Display */}
                {info && (
                    <div className="space-y-3">
                        {/* Tools Used */}
                        {info.tools && info.tools.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Tools Used:</span>
                                {info.tools.map((tool: string) => (
                                    <span
                                        key={tool}
                                        className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    >
                                        {tool}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* File Info Summary */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="font-medium">Filename:</span> {info.originalFilename}
                            </div>
                            <div>
                                <span className="font-medium">Size:</span> {(info.fileSize / 1024).toFixed(2)} KB
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">MIME Type:</span> {info.mimeType}
                            </div>
                        </div>

                        {/* Image Metadata */}
                        {info.image && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                                <div className="font-medium text-sm mb-2 text-green-800 dark:text-green-200">Image Metadata (via Pillow)</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><strong>Width:</strong> {info.image.width}px</div>
                                    <div><strong>Height:</strong> {info.image.height}px</div>
                                    <div><strong>Format:</strong> {info.image.format}</div>
                                    <div><strong>Mode:</strong> {info.image.mode}</div>
                                    {info.hasExif && <div className="col-span-2 text-green-600 dark:text-green-400">✓ Contains EXIF data</div>}
                                </div>
                            </div>
                        )}

                        {/* Video Metadata */}
                        {info.video && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
                                <div className="font-medium text-sm mb-2 text-purple-800 dark:text-purple-200">Video Metadata (via ffprobe)</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><strong>Width:</strong> {info.video.width}px</div>
                                    <div><strong>Height:</strong> {info.video.height}px</div>
                                    <div><strong>Codec:</strong> {info.video.codec}</div>
                                    <div><strong>Frame Rate:</strong> {info.video.frameRate}</div>
                                    {info.duration && <div><strong>Duration:</strong> {info.duration.toFixed(2)}s</div>}
                                    {info.format && <div><strong>Format:</strong> {info.format}</div>}
                                </div>
                            </div>
                        )}

                        {/* Audio Metadata */}
                        {info.audio && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                                <div className="font-medium text-sm mb-2 text-amber-800 dark:text-amber-200">Audio Metadata (via ffprobe)</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><strong>Codec:</strong> {info.audio.codec}</div>
                                    <div><strong>Channels:</strong> {info.audio.channels}</div>
                                    <div><strong>Sample Rate:</strong> {info.audio.sampleRate} Hz</div>
                                    {info.audio.bitRate && <div><strong>Bit Rate:</strong> {info.audio.bitRate} bps</div>}
                                    {info.duration && <div><strong>Duration:</strong> {info.duration.toFixed(2)}s</div>}
                                    {info.format && <div><strong>Format:</strong> {info.format}</div>}
                                </div>
                            </div>
                        )}

                        {/* Message */}
                        {info.message && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                                {info.message}
                            </div>
                        )}

                        {/* Raw JSON */}
                        <details className="mt-2">
                            <summary className="text-sm font-medium cursor-pointer hover:text-blue-600">
                                View Raw JSON
                            </summary>
                            <pre className="mt-2 text-xs overflow-auto p-3 bg-white dark:bg-black rounded border">
                                {JSON.stringify(info, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </section>
    )
}
