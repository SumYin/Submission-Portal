"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getFormByCode, uploadSubmission } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileUploader } from "@/components/file-uploader"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function SubmitByCodePage() {
  const params = useParams<{ code: string }>()
  const code = (params?.code as string) || ""
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState<Awaited<ReturnType<typeof getFormByCode>>>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const f = await getFormByCode(code)
      if (!mounted) return
      setForm(f)
      setNotFound(!f)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [code])

  if (loading) return <div className="min-h-dvh grid place-items-center">Loading…</div>
  if (notFound || !form) return <div className="min-h-dvh grid place-items-center">Form not found</div>

  const c = form.constraints

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit to: {form.title}</CardTitle>
          <CardDescription>{form.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Specifications</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {c.allowedTypes?.length ? (
                <div>Allowed types: {c.allowedTypes.join(", ")}</div>
              ) : (
                <div>Allowed types: any</div>
              )}
              {c.minSizeBytes ? <div>Min size: {c.minSizeBytes} bytes</div> : null}
              {c.maxSizeBytes ? <div>Max size: {c.maxSizeBytes} bytes</div> : null}
              {c.image ? (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">Image min {c.image.minWidth ?? "-"}x{c.image.minHeight ?? "-"}</Badge>
                  <Badge variant="secondary">Image max {c.image.maxWidth ?? "-"}x{c.image.maxHeight ?? "-"}</Badge>
                </div>
              ) : null}
              {c.video ? (
                <div className="flex gap-2 flex-wrap">
                  {c.video.minFrameRate || c.video.maxFrameRate ? (
                    <Badge variant="secondary">FPS {c.video.minFrameRate ?? "-"}-{c.video.maxFrameRate ?? "-"}</Badge>
                  ) : null}
                  {c.video.allowedCodecs?.length ? (
                    <Badge variant="secondary">Codecs: {c.video.allowedCodecs.join(", ")}</Badge>
                  ) : null}
                  {(c.video.minWidth || c.video.minHeight || c.video.maxWidth || c.video.maxHeight) ? (
                    <Badge variant="secondary">Video {c.video.minWidth ?? "-"}x{c.video.minHeight ?? "-"} → {c.video.maxWidth ?? "-"}x{c.video.maxHeight ?? "-"}</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <FileUploader
            acceptMimeTypes={c.allowedTypes}
            maxBytes={c.maxSizeBytes}
            minBytes={c.minSizeBytes}
            onUpload={async (file, onProgress) => {
              const res = await uploadSubmission({ code, file, onProgress })
              if (res.ok) toast.success("Upload accepted")
              else toast.error("Upload failed")
              return { ok: !!res.ok, errors: res.errors }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
