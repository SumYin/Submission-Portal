"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function FileUploader({
  acceptMimeTypes,
  maxBytes,
  minBytes,
  onUpload,
}: {
  acceptMimeTypes?: string[]
  maxBytes?: number
  minBytes?: number
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<{ ok: boolean; errors?: string[] }>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    setErrors([])
    setProgress(0)
    setFile(accepted[0] ?? null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: acceptMimeTypes && acceptMimeTypes.length ? acceptMimeTypes.reduce((acc, t) => ({ ...acc, [t]: [] as string[] }), {}) : undefined,
    maxSize: maxBytes,
  })

  const startUpload = async () => {
    if (!file) return
    // quick client pre-checks
    const errs: string[] = []
    if (minBytes && file.size < minBytes) errs.push(`File smaller than minimum ${minBytes} bytes`)
    if (maxBytes && file.size > maxBytes) errs.push(`File larger than maximum ${maxBytes} bytes`)
    if (acceptMimeTypes && acceptMimeTypes.length && !acceptMimeTypes.includes(file.type)) errs.push(`Type ${file.type || "unknown"} not allowed`)
    if (errs.length) {
      setErrors(errs)
      return
    }
    setBusy(true)
    setErrors([])
    const res = await onUpload(file, setProgress)
    if (!res.ok) setErrors(res.errors || ["Upload failed"])
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
          isDragActive ? "bg-muted" : "bg-background"
        }`}
      >
        <input {...getInputProps()} />
        {!file ? (
          <div>
            <p className="font-medium">Drag & drop a file here, or click to select</p>
            <p className="text-sm text-muted-foreground mt-1">Accepted: {acceptMimeTypes?.join(", ") || "any"}</p>
            {(minBytes || maxBytes) && (
              <div className="mt-2 space-x-2">
                {minBytes ? <Badge variant="secondary">Min {minBytes} B</Badge> : null}
                {maxBytes ? <Badge variant="secondary">Max {maxBytes} B</Badge> : null}
              </div>
            )}
          </div>
        ) : (
          <div className="text-left">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{file.type || "unknown"} • {file.size} bytes</p>
          </div>
        )}
      </div>

      {file ? (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setFile(null)} disabled={busy}>Remove</Button>
            <Button onClick={startUpload} disabled={busy}>Upload</Button>
          </div>
        </div>
      ) : null}

      {errors.length ? (
        <div className="text-sm text-red-600">
          <ul className="list-disc pl-5 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
