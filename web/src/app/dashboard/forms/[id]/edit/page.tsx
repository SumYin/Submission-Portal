"use client"

import { z } from "zod"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form as UIForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getForm, updateForm } from "@/lib/api"
import AuthGuard from "@/components/auth-guard"
import { toast } from "sonner"
import { Slider } from "@/components/ui/slider"
import { FILE_CATEGORIES, FileCategoryId, VIDEO_CODECS, AUDIO_CODECS, AUDIO_CHANNELS, ASPECT_RATIOS } from "@/lib/fileTaxonomy"
import CustomExtensionsInput from "../../../_components/custom-extensions-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const schema = z.object({
  title: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  kind: z.enum(["video","image","audio","other"]),
  allowedMimes: z.array(z.string()).default([]),
  customExtensions: z.array(z.string()).default([]),
  sizeMB: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]).optional(),
  image: z
    .object({
      minWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxWidth: z.number().optional(),
      maxHeight: z.number().optional(),
    })
    .optional(),
  video: z
    .object({
      minFrameRate: z.number().optional(),
      maxFrameRate: z.number().optional(),
      minWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxWidth: z.number().optional(),
      maxHeight: z.number().optional(),
      allowedCodecs: z.array(z.string()).optional(),
      allowedAspectRatios: z.array(z.string()).optional(),
      bitrateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      framesRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      durationRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      lengthMode: z.enum(["frames","duration"]).optional(),
      audio: z
        .object({
          allowedCodecs: z.array(z.string()).optional(),
          allowedChannels: z.array(z.string()).optional(),
          sampleRateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
          bitrateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
        })
        .optional(),
    })
    .optional(),
  audio: z
    .object({
      allowedCodecs: z.array(z.string()).optional(),
      allowedChannels: z.array(z.string()).optional(),
      sampleRateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      bitrateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      durationRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
    })
    .optional(),
})

export default function EditFormPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { title: "", description: "", kind: "image", allowedMimes: [], customExtensions: [], sizeMB: [0, 100] },
  })
  const kind = useWatch({ control: form.control, name: "kind" })
  const allowedMimesVal = useWatch({ control: form.control, name: "allowedMimes" }) as string[] | undefined
  const customExtensionsVal = useWatch({ control: form.control, name: "customExtensions" }) as string[] | undefined
  const lengthMode = useWatch({ control: form.control, name: "video.lengthMode" }) as "frames" | "duration" | undefined

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const f = await getForm(id)
      if (!f) return
      // Infer kind from allowed types
      const at = f.constraints.allowedTypes || []
      const hasImage = at.some((m) => m.startsWith("image/"))
      const hasVideo = at.some((m) => m.startsWith("video/"))
      const hasAudio = at.some((m) => m.startsWith("audio/"))
      const inferredKind: "image"|"video"|"audio"|"other" = hasVideo ? "video" : hasAudio ? "audio" : hasImage ? "image" : "other"
      const catId: FileCategoryId = inferredKind === "image" ? "images" : inferredKind === "video" ? "video" : inferredKind === "audio" ? "audio" : ("text" as FileCategoryId)
  const catMimes = (FILE_CATEGORIES.find((c) => c.id === catId)?.mimes || []) as string[]
      const allowedMimes = (f.constraints.allowedTypes || []).filter((m) => catMimes.includes(m))
      const minMB = Math.max(0, Math.round((f.constraints.minSizeBytes || 0) / (1024 * 1024)))
      const maxMB = Math.min(100, Math.round((f.constraints.maxSizeBytes || 0) / (1024 * 1024)))
      form.reset({
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
              allowedAspectRatios: f.constraints.video.allowedAspectRatios,
              bitrateRange: [f.constraints.video.minBitrateKbps ?? 0, f.constraints.video.maxBitrateKbps ?? 0],
              framesRange: [f.constraints.video.minFrames ?? 0, f.constraints.video.maxFrames ?? 0],
              durationRange: [f.constraints.video.minDurationSec ?? 0, f.constraints.video.maxDurationSec ?? 0],
              audio: f.constraints.video.audio
                ? {
                    allowedCodecs: f.constraints.video.audio.allowedCodecs,
                    allowedChannels: f.constraints.video.audio.allowedChannels,
                    sampleRateRange: [f.constraints.video.audio.minSampleRateHz ?? 0, f.constraints.video.audio.maxSampleRateHz ?? 0],
                    bitrateRange: [f.constraints.video.audio.minBitrateKbps ?? 0, f.constraints.video.audio.maxBitrateKbps ?? 0],
                  }
                : undefined,
            }
          : undefined,
        audio: f.constraints.audio
          ? {
              allowedCodecs: f.constraints.audio.allowedCodecs,
              allowedChannels: f.constraints.audio.allowedChannels,
              sampleRateRange: [f.constraints.audio.minSampleRateHz ?? 0, f.constraints.audio.maxSampleRateHz ?? 0],
              bitrateRange: [f.constraints.audio.minBitrateKbps ?? 0, f.constraints.audio.maxBitrateKbps ?? 0],
              durationRange: [f.constraints.audio.minDurationSec ?? 0, f.constraints.audio.maxDurationSec ?? 0],
            }
          : undefined,
      })
    })()
  }, [id, form])

  const onSave = async (values: z.infer<typeof schema>) => {
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
                allowedAspectRatios: values.video.allowedAspectRatios,
                minBitrateKbps: values.video.bitrateRange?.[0],
                maxBitrateKbps: values.video.bitrateRange?.[1],
                minFrames: values.video.lengthMode === "frames" ? values.video.framesRange?.[0] : undefined,
                maxFrames: values.video.lengthMode === "frames" ? values.video.framesRange?.[1] : undefined,
                minDurationSec: values.video.lengthMode === "duration" ? values.video.durationRange?.[0] : undefined,
                maxDurationSec: values.video.lengthMode === "duration" ? values.video.durationRange?.[1] : undefined,
                audio: values.video.audio
                  ? {
                      allowedCodecs: values.video.audio.allowedCodecs,
                      allowedChannels: values.video.audio.allowedChannels,
                      minSampleRateHz: values.video.audio.sampleRateRange?.[0],
                      maxSampleRateHz: values.video.audio.sampleRateRange?.[1],
                      minBitrateKbps: values.video.audio.bitrateRange?.[0],
                      maxBitrateKbps: values.video.audio.bitrateRange?.[1],
                    }
                  : undefined,
              }
            : undefined,
          audio: values.audio
            ? {
                allowedCodecs: values.audio.allowedCodecs,
                allowedChannels: values.audio.allowedChannels,
                minSampleRateHz: values.audio.sampleRateRange?.[0],
                maxSampleRateHz: values.audio.sampleRateRange?.[1],
                minBitrateKbps: values.audio.bitrateRange?.[0],
                maxBitrateKbps: values.audio.bitrateRange?.[1],
                minDurationSec: values.audio.durationRange?.[0],
                maxDurationSec: values.audio.durationRange?.[1],
              }
            : undefined,
        },
      }
      await updateForm(id, payload)
      toast.success("Form updated. New constraints apply to future submissions only.")
      router.push(`/dashboard/forms/${id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(msg || "Failed to update form")
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Edit form</h1>
        <Card>
          <CardHeader>
            <CardTitle>Guided setup</CardTitle>
          </CardHeader>
          <CardContent>
            <UIForm {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSave)}>
                <Tabs defaultValue="type" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="type">Type</TabsTrigger>
                    <TabsTrigger value="constraints">Constraints</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                  </TabsList>

                  <TabsContent value="type" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Spring Art Showcase" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the submission requirements" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <FormLabel>Choose file type</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { id: "image", label: "Pictures" },
                          { id: "video", label: "Videos" },
                          { id: "audio", label: "Audio" },
                          { id: "other", label: "Others" },
                        ] as const).map((opt) => {
                          const selected = kind === opt.id
                          return (
                            <Button
                              key={opt.id}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              onClick={() => form.setValue("kind", opt.id)}
                            >
                              {opt.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="constraints" className="space-y-6">
                    <div className="space-y-3">
                      <FormLabel>Allowed formats</FormLabel>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const catId: FileCategoryId =
                              kind === "image" ? "images" : kind === "video" ? "video" : kind === "audio" ? "audio" : ("text" as FileCategoryId)
                            const mimes = FILE_CATEGORIES.find((c) => c.id === catId)?.mimes ?? []
                            const fieldValue = allowedMimesVal || []
                            return mimes.map((m) => {
                              const label = m.split("/")[1]
                              const selected = fieldValue.includes(m)
                              return (
                                <Button
                                  key={m}
                                  type="button"
                                  variant={selected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    const set = new Set(fieldValue)
                                    if (selected) set.delete(m)
                                    else set.add(m)
                                    form.setValue("allowedMimes", Array.from(set))
                                  }}
                                >
                                  .{label}
                                </Button>
                              )
                            })
                          })()}
                        </div>
                        {kind === "other" ? (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Custom extensions for Others</div>
                            <CustomExtensionsInput values={customExtensionsVal || []} onChange={(vals) => form.setValue("customExtensions", vals)} />
                            <div className="text-xs text-muted-foreground">Examples: .txt, .zip, .json</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Additional custom extensions</div>
                            <CustomExtensionsInput values={customExtensionsVal || []} onChange={(vals) => form.setValue("customExtensions", vals)} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>File size (MB)</FormLabel>
                      <FormField
                        control={form.control}
                        name="sizeMB"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Slider
                                value={(field.value as [number, number] | undefined) ?? [0, 100]}
                                onValueChange={(v: number[]) => field.onChange(v as [number, number])}
                                min={0}
                                max={100}
                                step={1}
                              />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {(field.value as [number, number] | undefined)?.[0] ?? 0} MB</span>
                              <span>Max: {(field.value as [number, number] | undefined)?.[1] ?? 100} MB</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {kind === "image" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="image.minWidth" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image min width</FormLabel>
                            <FormControl>
                              <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="image.minHeight" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image min height</FormLabel>
                            <FormControl>
                              <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="image.maxWidth" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image max width</FormLabel>
                            <FormControl>
                              <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="image.maxHeight" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image max height</FormLabel>
                            <FormControl>
                              <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    ) : null}

                    {kind === "video" ? (
                      <div className="space-y-4">
                        <div className="text-sm font-medium">Video</div>
                        <FormField control={form.control} name="video.allowedCodecs" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codecs</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {VIDEO_CODECS.map((c) => {
                                const selected = (field.value || []).includes(c)
                                return (
                                  <Button key={c} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                                    const set = new Set(field.value || [])
                                    if (selected) set.delete(c)
                                    else set.add(c)
                                    field.onChange(Array.from(set))
                                  }}>{c.toUpperCase()}</Button>
                                )
                              })}
                            </div>
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="video.minFrameRate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min FPS</FormLabel>
                              <FormControl>
                                <Slider value={[field.value ?? 0]} onValueChange={(v: number[]) => field.onChange(v[0])} min={0} max={240} step={1} />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">{field.value ?? 0} fps</div>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="video.maxFrameRate" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max FPS</FormLabel>
                              <FormControl>
                                <Slider value={[field.value ?? 60]} onValueChange={(v: number[]) => field.onChange(v[0])} min={1} max={240} step={1} />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">{field.value ?? 60} fps</div>
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="video.minWidth" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min width</FormLabel>
                              <FormControl>
                                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="video.minHeight" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min height</FormLabel>
                              <FormControl>
                                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="video.maxWidth" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max width</FormLabel>
                              <FormControl>
                                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="video.maxHeight" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max height</FormLabel>
                              <FormControl>
                                <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="video.allowedAspectRatios" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aspect ratios</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {ASPECT_RATIOS.map((ar) => {
                                const selected = (field.value || []).includes(ar)
                                return (
                                  <Button key={ar} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                                    const set = new Set(field.value || [])
                                    if (selected) set.delete(ar)
                                    else set.add(ar)
                                    field.onChange(Array.from(set))
                                  }}>{ar}</Button>
                                )
                              })}
                            </div>
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="video.bitrateRange" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Video bitrate (kbps)</FormLabel>
                              <FormControl>
                                <Slider value={(field.value as number[] | undefined) ?? [0, 8000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={50000} step={100} />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 0}</span><span>Max: {field.value?.[1] ?? 8000}</span></div>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="video.framesRange" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frames count</FormLabel>
                              <FormControl>
                                <Slider value={(field.value as number[] | undefined) ?? [0, 300000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={1000000} step={100} />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 0}</span><span>Max: {field.value?.[1] ?? 300000}</span></div>
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="video.lengthMode" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Length constraint by</FormLabel>
                              <div className="flex gap-2">
                                {(["frames","duration"] as const).map((opt) => (
                                  <Button key={opt} type="button" variant={field.value === opt ? "default" : "outline"} size="sm" onClick={() => field.onChange(opt)}>
                                    {opt === "frames" ? "Frames" : "Duration (s)"}
                                  </Button>
                                ))}
                              </div>
                            </FormItem>
                          )} />
                          {lengthMode === "duration" ? (
                            <FormField control={form.control} name="video.durationRange" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (seconds)</FormLabel>
                                <FormControl>
                                  <Slider value={(field.value as number[] | undefined) ?? [0, 600]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={86400} step={1} />
                                </FormControl>
                                <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 0}s</span><span>Max: {field.value?.[1] ?? 600}s</span></div>
                              </FormItem>
                            )} />
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">Audio stream (if present)</div>
                          <FormField control={form.control} name="video.audio.allowedCodecs" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audio codecs</FormLabel>
                              <div className="flex flex-wrap gap-2">
                                {AUDIO_CODECS.map((c) => {
                                  const selected = (field.value || []).includes(c)
                                  return (
                                    <Button key={c} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                                      const set = new Set(field.value || [])
                                      if (selected) set.delete(c)
                                      else set.add(c)
                                      field.onChange(Array.from(set))
                                    }}>{c.toUpperCase()}</Button>
                                  )
                                })}
                              </div>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="video.audio.allowedChannels" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Channels</FormLabel>
                              <div className="flex flex-wrap gap-2">
                                {AUDIO_CHANNELS.map((ch) => {
                                  const selected = (field.value || []).includes(ch)
                                  return (
                                    <Button key={ch} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                                      const set = new Set(field.value || [])
                                      if (selected) set.delete(ch)
                                      else set.add(ch)
                                      field.onChange(Array.from(set))
                                    }}>{ch}</Button>
                                  )
                                })}
                              </div>
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="video.audio.sampleRateRange" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sample rate (Hz)</FormLabel>
                                <FormControl>
                                  <Slider value={(field.value as number[] | undefined) ?? [8000, 48000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={8000} max={192000} step={1000} />
                                </FormControl>
                                <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 8000}</span><span>Max: {field.value?.[1] ?? 48000}</span></div>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="video.audio.bitrateRange" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Audio bitrate (kbps)</FormLabel>
                                <FormControl>
                                  <Slider value={(field.value as number[] | undefined) ?? [0, 320]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={512} step={8} />
                                </FormControl>
                                <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 0}</span><span>Max: {field.value?.[1] ?? 320}</span></div>
                              </FormItem>
                            )} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {kind === "audio" ? (
                      <div className="space-y-4">
                        <div className="text-sm font-medium">Audio</div>
                        <FormField control={form.control} name="audio.allowedCodecs" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codecs</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {AUDIO_CODECS.map((c) => {
                                const selected = (field.value || []).includes(c)
                                return (
                                  <Button key={c} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                                    const set = new Set(field.value || [])
                                    if (selected) set.delete(c)
                                    else set.add(c)
                                    field.onChange(Array.from(set))
                                  }}>{c.toUpperCase()}</Button>
                                )
                              })}
                            </div>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="audio.allowedChannels" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channels</FormLabel>
                            <div className="flex flex-wrap gap-2">
                              {AUDIO_CHANNELS.map((ch) => {
                                const selected = (field.value || []).includes(ch)
                                return (
                                  <Button key={ch} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                                    const set = new Set(field.value || [])
                                    if (selected) set.delete(ch)
                                    else set.add(ch)
                                    field.onChange(Array.from(set))
                                  }}>{ch}</Button>
                                )
                              })}
                            </div>
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="audio.sampleRateRange" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sample rate (Hz)</FormLabel>
                              <FormControl>
                                <Slider value={(field.value as number[] | undefined) ?? [8000, 48000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={8000} max={192000} step={1000} />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 8000}</span><span>Max: {field.value?.[1] ?? 48000}</span></div>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="audio.bitrateRange" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bitrate (kbps)</FormLabel>
                              <FormControl>
                                <Slider value={(field.value as number[] | undefined) ?? [0, 320]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={2000} step={8} />
                              </FormControl>
                              <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 0}</span><span>Max: {field.value?.[1] ?? 320}</span></div>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="audio.durationRange" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (seconds)</FormLabel>
                            <FormControl>
                              <Slider value={(field.value as number[] | undefined) ?? [0, 600]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={86400} step={1} />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Min: {field.value?.[0] ?? 0}s</span><span>Max: {field.value?.[1] ?? 600}s</span></div>
                          </FormItem>
                        )} />
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="review" className="space-y-4">
                    <p className="text-sm text-muted-foreground">Review your changes, then save.</p>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </UIForm>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
