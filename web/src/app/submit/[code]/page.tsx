"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getFormByCode, getUser, getUserProfile, uploadSubmission } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileUploader } from "@/components/file-uploader"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import AuthGuard from "@/components/auth-guard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function formatDateTime(input?: string) {
  if (!input) return "anytime"
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return "unknown"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export default function SubmitByCodePage() {
  const params = useParams<{ code: string }>()
  const code = (params?.code as string) || ""
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState<Awaited<ReturnType<typeof getFormByCode>>>(null)
  const [ownerName, setOwnerName] = useState<string>("")
  const [ownerId, setOwnerId] = useState<string>("")

  useEffect(() => {
    let mounted = true
      ; (async () => {
        const f = await getFormByCode(code)
        if (!mounted) return
        setForm(f)
        setNotFound(!f)
        setLoading(false)
        if (f) {
          const [u, p] = await Promise.all([getUser(f.createdBy), getUserProfile(f.createdBy)])
          const name = (p?.name && p.name.trim()) ? p!.name! : (u?.username ?? f.createdBy)
          setOwnerName(name)
          setOwnerId(u?.id ?? f.createdBy)
        }
      })()
    return () => {
      mounted = false
    }
  }, [code])

  if (loading) return <div className="min-h-dvh grid place-items-center">Loading…</div>
  if (notFound || !form) return <div className="min-h-dvh grid place-items-center">Form not found</div>

  const c = form.constraints
  const opensAtDate = form.opensAt ? new Date(form.opensAt) : undefined
  const closesAtDate = form.closesAt ? new Date(form.closesAt) : undefined
  const now = new Date()
  const notOpenYet = opensAtDate ? now < opensAtDate : false
  const closed = closesAtDate ? now > closesAtDate : false
  const status: "open" | "not-open" | "closed" = notOpenYet ? "not-open" : closed ? "closed" : "open"
  const disabledReason = status === "not-open"
    ? `Submissions open on ${formatDateTime(form.opensAt)}`
    : status === "closed"
      ? `Submissions closed on ${formatDateTime(form.closesAt)}`
      : undefined

  const handleUpload = async (file: File, onProgress: (p: number) => void) => {
    if (status === "not-open") {
      const message = "Submissions are not open yet"
      toast.error(message)
      return { ok: false, errors: [message] }
    }
    if (status === "closed") {
      const message = "Submissions are closed"
      toast.error(message)
      return { ok: false, errors: [message] }
    }
    const res = await uploadSubmission({ code, file, onProgress })
    if (res.ok) toast.success("Upload accepted")
    else toast.error(res.errors?.[0] || "Upload failed")
    return { ok: !!res.ok, errors: res.errors }
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Submit to: {form.title}</CardTitle>
            <CardDescription>{form.description}</CardDescription>
            {ownerId ? (
              <div className="text-sm text-muted-foreground mt-2">
                Created by {" "}
                <Link href={`/profile/${ownerId}`} className="underline underline-offset-4">{ownerName}</Link>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {status !== "open" ? (
              <Alert variant="destructive">
                <AlertTitle>{status === "not-open" ? "Submissions not open yet" : "Submissions closed"}</AlertTitle>
                <AlertDescription>{disabledReason}</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Submissions open</AlertTitle>
                <AlertDescription>
                  {form.opensAt ? `Opens: ${formatDateTime(form.opensAt)} · ` : null}
                  {form.closesAt ? `Closes: ${formatDateTime(form.closesAt)}` : "No close date set"}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <p className="text-sm font-medium mb-1">Specifications</p>
              <div className="text-sm text-muted-foreground space-y-1">
                {c.allowedTypes?.length ? (
                  <div>Allowed types: {c.allowedTypes.join(", ")}</div>
                ) : (
                  <div>Allowed types: any</div>
                )}
                {c.minSizeBytes ? <div>Min size: {Math.round(c.minSizeBytes / (1024 * 1024))} MB</div> : null}
                {c.maxSizeBytes ? <div>Max size: {Math.round(c.maxSizeBytes / (1024 * 1024))} MB</div> : null}
                {(form.opensAt || form.closesAt) ? (
                  <div>
                    Availability: {form.opensAt ? formatDateTime(form.opensAt) : "now"} → {form.closesAt ? formatDateTime(form.closesAt) : "no deadline"}
                  </div>
                ) : (
                  <div>Availability: anytime</div>
                )}
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
                {c.audio ? (
                  <div className="flex gap-2 flex-wrap">
                    {c.audio.allowedCodecs?.length ? (
                      <Badge variant="secondary">Codecs: {c.audio.allowedCodecs.join(", ")}</Badge>
                    ) : null}
                    {c.audio.minSampleRateHz || c.audio.maxSampleRateHz ? (
                      <Badge variant="secondary">Hz {c.audio.minSampleRateHz ?? "-"}-{c.audio.maxSampleRateHz ?? "-"}</Badge>
                    ) : null}
                    {c.audio.minBitrateKbps || c.audio.maxBitrateKbps ? (
                      <Badge variant="secondary">Kbps {c.audio.minBitrateKbps ?? "-"}-{c.audio.maxBitrateKbps ?? "-"}</Badge>
                    ) : null}
                    {c.audio.minDurationSec || c.audio.maxDurationSec ? (
                      <Badge variant="secondary">Duration {c.audio.minDurationSec ?? "-"}s-{c.audio.maxDurationSec ?? "-"}s</Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            <FileUploader
              acceptMimeTypes={c.allowAllTypes ? undefined : c.allowedTypes}
              acceptExtensions={c.allowAllTypes ? undefined : c.allowedExtensions}
              maxBytes={c.maxSizeBytes}
              minBytes={c.minSizeBytes}
              disabled={status !== "open"}
              disabledReason={disabledReason}
              onUpload={handleUpload}
            />
            <div className="text-xs text-muted-foreground">Note: Maximum file size is capped at 100 MB.</div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
