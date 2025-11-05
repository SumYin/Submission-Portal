"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function FileUploader({
  acceptMimeTypes,
  acceptExtensions,
  maxBytes,
  minBytes,
  onUpload,
  disabled = false,
  disabledReason,
}: {
  acceptMimeTypes?: string[]
  acceptExtensions?: string[]
  maxBytes?: number
  minBytes?: number
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<{ ok: boolean; errors?: string[] }>
  disabled?: boolean
  disabledReason?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    if (disabled) {
      setErrors(disabledReason ? [disabledReason] : ["Uploads are currently disabled"])
      return
    }
    setErrors([])
    setProgress(0)
    setFile(accepted[0] ?? null)
  }, [disabled, disabledReason])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept:
      (acceptMimeTypes && acceptMimeTypes.length) || (acceptExtensions && acceptExtensions.length)
        ? {
            ...(acceptMimeTypes || []).reduce((acc, t) => ({ ...acc, [t]: [] as string[] }), {} as Record<string, string[]>),
            ...(acceptExtensions || []).reduce((acc, ext) => ({ ...acc, [ext.startsWith(".") ? ext : `.${ext}`]: [] as string[] }), {} as Record<string, string[]>),
          }
        : undefined,
    maxSize: maxBytes,
    disabled,
  })

  const startUpload = async () => {
    if (disabled) {
      setErrors(disabledReason ? [disabledReason] : ["Uploads are currently disabled"])
      return
    }
    if (!file) return
    // quick client pre-checks
    const errs: string[] = []
    const toMB = (b: number) => Math.round((b / (1024 * 1024)) * 10) / 10
    if (minBytes && file.size < minBytes) errs.push(`File smaller than minimum ${toMB(minBytes)} MB`)
    if (maxBytes && file.size > maxBytes) errs.push(`File larger than maximum ${toMB(maxBytes)} MB`)
    if (acceptMimeTypes && acceptMimeTypes.length && !acceptMimeTypes.includes(file.type)) {
      if (acceptExtensions && acceptExtensions.length) {
        const ext = (file.name.match(/\.[^.]+$/)?.[0] || "").toLowerCase()
        if (!acceptExtensions.map((e) => (e.startsWith(".") ? e.toLowerCase() : `.${e.toLowerCase()}`)).includes(ext)) {
          errs.push(`Type ${file.type || "unknown"} not allowed`)
        }
      } else {
        errs.push(`Type ${file.type || "unknown"} not allowed`)
      }
    }
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
        className={cn(
          "border-2 border-dashed rounded-md p-6 text-center",
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          isDragActive && !disabled ? "bg-muted" : "bg-background",
        )}
      >
        <input {...getInputProps()} />
        {!file ? (
          <div>
            <p className="font-medium">Drag & drop a file here, or click to select</p>
            <p className="text-sm text-muted-foreground mt-1">
              Accepted: {acceptMimeTypes?.join(", ") || (acceptExtensions?.join(", ") || "any")}
            </p>
            {(minBytes || maxBytes) && (
              <div className="mt-2 space-x-2">
                {minBytes ? <Badge variant="secondary">Min {Math.round(minBytes / (1024 * 1024))} MB</Badge> : null}
                {maxBytes ? <Badge variant="secondary">Max {Math.round(maxBytes / (1024 * 1024))} MB</Badge> : null}
              </div>
            )}
            {disabled && disabledReason ? (
              <p className="mt-3 text-sm text-muted-foreground">{disabledReason}</p>
            ) : null}
          </div>
        ) : (
          <div className="text-left">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{file.type || "unknown"} • {Math.round(file.size / (1024 * 1024))} MB</p>
          </div>
        )}
      </div>

      {file ? (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setFile(null)} disabled={busy}>Remove</Button>
            <Button onClick={startUpload} disabled={busy || disabled}>Upload</Button>
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
