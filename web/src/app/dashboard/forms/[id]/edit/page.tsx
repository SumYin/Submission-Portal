"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getForm, updateForm } from "@/lib/api"
import AuthGuard from "@/components/auth-guard"
import { toast } from "sonner"
import { FILE_CATEGORIES, FileCategoryId } from "@/lib/fileTaxonomy"
import FormEditor, { FormValues } from "../../../_components/form-editor"
import { useState } from "react"

export default function EditFormPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const router = useRouter()
  const [initialValues, setInitialValues] = useState<Partial<FormValues> | undefined>(undefined)

  useEffect(() => {
    if (!id) return
      ; (async () => {
        const f = await getForm(id)
        if (!f) return

        // --- Robust Kind Inference Logic ---
        let inferredKind: "image" | "video" | "audio" | "other" = "other"

        // 1. Direct Read
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((f.constraints as any).kind) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const k = (f.constraints as any).kind
          if (["image", "video", "audio", "other"].includes(k)) {
            inferredKind = k as "image" | "video" | "audio" | "other"
          }
        }
        // 2. Constraint-based Inference (Priority)
        else {
          const hasVideoConstraints = f.constraints.video && Object.keys(f.constraints.video).length > 0
          const hasAudioConstraints = f.constraints.audio && Object.keys(f.constraints.audio).length > 0
          const hasImageConstraints = f.constraints.image && Object.keys(f.constraints.image).length > 0

          if (hasVideoConstraints) inferredKind = "video"
          else if (hasAudioConstraints) inferredKind = "audio"
          else if (hasImageConstraints) inferredKind = "image"
          // 3. MIME-based Inference (Fallback)
          else {
            const at = f.constraints.allowedTypes || []
            const hasImage = at.some((m) => m.startsWith("image/"))
            const hasVideo = at.some((m) => m.startsWith("video/"))
            const hasAudio = at.some((m) => m.startsWith("audio/"))
            inferredKind = hasVideo ? "video" : hasAudio ? "audio" : hasImage ? "image" : "other"
          }
        }

        const catId: FileCategoryId = inferredKind === "image" ? "images" : inferredKind === "video" ? "video" : inferredKind === "audio" ? "audio" : ("text" as FileCategoryId)
        const catMimes = (FILE_CATEGORIES.find((c) => c.id === catId)?.mimes || []) as string[]

        // If kind is inferred, we might want to pre-fill allowedMimes even if empty on backend?
        // No, we should respect what's on backend. But if it was "other", allowedMimes was likely custom.
        const allowedMimes = (f.constraints.allowedTypes || []).filter((m) => catMimes.includes(m))

        const minMB = Math.max(0, Math.round((f.constraints.minSizeBytes || 0) / (1024 * 1024)))
        const maxMB = Math.min(100, Math.round((f.constraints.maxSizeBytes || 0) / (1024 * 1024)))

        setInitialValues({
          title: f.title,
          description: f.description ?? "",
          kind: inferredKind,
          allowedMimes,
          customExtensions: f.constraints.allowedExtensions || [],
          sizeMB: [minMB, maxMB],
          image: f.constraints.image,
          video: f.constraints.video
            ? {
              minFrameRate: f.constraints.video.minFrameRate,
              maxFrameRate: f.constraints.video.maxFrameRate,
              minWidth: f.constraints.video.minWidth,
              minHeight: f.constraints.video.minHeight,
              maxWidth: f.constraints.video.maxWidth,
              maxHeight: f.constraints.video.maxHeight,
              allowedCodecs: f.constraints.video.allowedCodecs,
              bitrateRange: [f.constraints.video.minBitrateKbps ?? 0, f.constraints.video.maxBitrateKbps ?? 0],
              durationRange: [f.constraints.video.minDurationSec ?? 0, f.constraints.video.maxDurationSec ?? 0],
            }
            : undefined,
          audio: f.constraints.audio
            ? {
              allowedCodecs: f.constraints.audio.allowedCodecs,
              allowedChannels: f.constraints.audio.allowedChannels,

              durationRange: [f.constraints.audio.minDurationSec ?? 0, f.constraints.audio.maxDurationSec ?? 0],
            }
            : undefined,
          opensAt: f.opensAt ?? undefined,
          closesAt: f.closesAt ?? undefined,
        })
      })()
  }, [id])

  const onSave = async (values: FormValues) => {
    try {
      const selectedMimes = values.allowedMimes
      const [minMB, maxMB] = (values.sizeMB as [number, number] | undefined) || [0, 100]
      const minSizeBytes = Math.max(0, Math.round(minMB * 1024 * 1024))
      const maxSizeBytes = Math.min(100, Math.round(maxMB)) * 1024 * 1024
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        title: values.title,
        description: values.description || undefined,
        constraints: {
          kind: values.kind,
          allowAllTypes: false,
          allowedTypes: selectedMimes,
          allowedExtensions: values.customExtensions,
          minSizeBytes,
          maxSizeBytes,
          image: values.image,
          video: values.video
            ? {
              minFrameRate: values.video.minFrameRate,
              maxFrameRate: values.video.maxFrameRate,
              minWidth: values.video.minWidth,
              minHeight: values.video.minHeight,
              maxWidth: values.video.maxWidth,
              maxHeight: values.video.maxHeight,
              allowedCodecs: values.video.allowedCodecs,
              minBitrateKbps: values.video.bitrateRange?.[0],
              maxBitrateKbps: values.video.bitrateRange?.[1],
              minDurationSec: values.video.durationRange?.[0],
              maxDurationSec: values.video.durationRange?.[1],
            }
            : undefined,
          audio: values.audio
            ? {
              allowedCodecs: values.audio.allowedCodecs,
              allowedChannels: values.audio.allowedChannels,

              minDurationSec: values.audio.durationRange?.[0],
              maxDurationSec: values.audio.durationRange?.[1],
            }
            : undefined,
        },
        opensAt: values.opensAt || undefined,
        closesAt: values.closesAt || undefined,
      }
      await updateForm(id, payload)
      toast.success("Form updated. New constraints apply to future submissions only.")
      router.push(`/dashboard/forms/${id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(msg || "Failed to update form")
    }
  }

  if (!initialValues) {
    return (
      <AuthGuard>
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <h1 className="text-2xl font-semibold">Edit form</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Edit form</h1>
        <FormEditor
          mode="edit"
          initialValues={initialValues}
          onSubmit={onSave}
          onCancel={() => router.back()}
        />
      </div>
    </AuthGuard>
  )
}
