"use client"

import { createForm } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import AuthGuard from "@/components/auth-guard"
import FormEditor, { FormValues } from "../_components/form-editor"

export default function NewFormPage() {
  const router = useRouter()

  const onCreate = async (values: FormValues) => {
    // Build allowed MIME list based on chosen kind
    const selectedMimes = values.allowedMimes
    // Convert MB to bytes, clamp to 100MB
    const [minMB, maxMB] = (values.sizeMB as [number, number] | undefined) || [0, 100]
    const minSizeBytes = Math.max(0, Math.round(minMB * 1024 * 1024))
    const maxSizeBytes = Math.min(100, Math.round(maxMB)) * 1024 * 1024
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const constraints: any = {
      kind: values.kind,
      allowAllTypes: false,
      allowedTypes: selectedMimes,
      allowedExtensions: values.customExtensions,
      minSizeBytes,
      maxSizeBytes,
    }
    if (values.image) {
      constraints.image = { ...values.image }
    }
    if (values.video) {
      const v = values.video
      const [minBitrateKbps, maxBitrateKbps] = v.bitrateRange || [undefined, undefined]
      const [minDurationSec, maxDurationSec] = v.durationRange || [undefined, undefined]
      constraints.video = {
        minFrameRate: v.minFrameRate,
        maxFrameRate: v.maxFrameRate,
        minWidth: v.minWidth,
        minHeight: v.minHeight,
        maxWidth: v.maxWidth,
        maxHeight: v.maxHeight,
        allowedCodecs: v.allowedCodecs,
        minBitrateKbps,
        maxBitrateKbps,
        minDurationSec,
        maxDurationSec,
      }
    }
    if (values.audio) {
      const a = values.audio
      const [minDurationSec, maxDurationSec] = a.durationRange || [undefined, undefined]
      constraints.audio = {
        allowedCodecs: a.allowedCodecs,
        allowedChannels: a.allowedChannels,
        minDurationSec,
        maxDurationSec,
      }
    }
    try {
      const f = await createForm({
        title: values.title,
        description: values.description,
        constraints,
        opensAt: values.opensAt || undefined,
        closesAt: values.closesAt || undefined,
      })
      toast.success("Form created")
      router.push(`/dashboard/forms/${f.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(msg || "Failed to create form")
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Create form</h1>
        <FormEditor
          mode="create"
          onSubmit={onCreate}
          initialValues={{
            kind: "image",
            allowedMimes: ["image/jpeg", "image/png"],
          }}
        />
      </div>
    </AuthGuard>
  )
}
