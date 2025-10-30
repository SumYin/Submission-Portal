"use client"

import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createForm } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import AuthGuard from "@/components/auth-guard"
import { Slider } from "@/components/ui/slider"
import { FILE_CATEGORIES, FileCategoryId, VIDEO_CODECS, AUDIO_CODECS, AUDIO_CHANNELS, ASPECT_RATIOS } from "@/lib/fileTaxonomy"
import CustomExtensionsInput from "../_components/custom-extensions-input"
import { DateTimePicker } from "@/components/ui/date-time-picker"

// Form schema for creation UI
const schema = z.object({
  title: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  // Step 1: pick exactly one kind
  kind: z.enum(["video","image","audio","other"]),
  // Step 2: constraints, size in MB (0..100)
  sizeMB: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]).optional(),
  // Allowed formats per kind
  allowedMimes: z.array(z.string()).default([]),
  customExtensions: z.array(z.string()).default([]),
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
      bitrateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(), // kbps
      framesRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      durationRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(), // seconds
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
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
})

export default function NewFormPage() {
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({
    // Cast resolver to avoid strict generic incompatibilities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: "",
      description: "",
      kind: "image",
      customExtensions: [],
      allowedMimes: ["image/jpeg","image/png"],
  sizeMB: [0, 100],
      video: {
        allowedCodecs: ["h264"],
        allowedAspectRatios: ["16:9"],
      },
    },
  })

  // Reactive values for lints-safe reads
  const kind = useWatch({ control: form.control, name: "kind" })
  const allowedMimesVal = useWatch({ control: form.control, name: "allowedMimes" }) as string[] | undefined
  const customExtensionsVal = useWatch({ control: form.control, name: "customExtensions" }) as string[] | undefined
  const lengthMode = useWatch({ control: form.control, name: "video.lengthMode" }) as "frames" | "duration" | undefined

  const onCreate = async () => {
    const values = form.getValues()
    // Build allowed MIME list based on chosen kind
    const selectedMimes = values.allowedMimes
    // Convert MB to bytes, clamp to 100MB
  const [minMB, maxMB] = (values.sizeMB as [number, number] | undefined) || [0, 100]
    const minSizeBytes = Math.max(0, Math.round(minMB * 1024 * 1024))
    const maxSizeBytes = Math.min(100, Math.round(maxMB)) * 1024 * 1024
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const constraints: any = {
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
      const [minFrames, maxFrames] = v.framesRange || [undefined, undefined]
      const [minDurationSec, maxDurationSec] = v.durationRange || [undefined, undefined]
      const [minSampleRateHz, maxSampleRateHz] = v.audio?.sampleRateRange || [undefined, undefined]
      const [minAudioBitrateKbps, maxAudioBitrateKbps] = v.audio?.bitrateRange || [undefined, undefined]
      constraints.video = {
        minFrameRate: v.minFrameRate,
        maxFrameRate: v.maxFrameRate,
        minWidth: v.minWidth,
        minHeight: v.minHeight,
        maxWidth: v.maxWidth,
        maxHeight: v.maxHeight,
        allowedCodecs: v.allowedCodecs,
        allowedAspectRatios: v.allowedAspectRatios,
        minBitrateKbps,
        maxBitrateKbps,
        ...(v.lengthMode === "frames"
          ? { minFrames, maxFrames }
          : { minFrames: undefined, maxFrames: undefined }),
        ...(v.lengthMode === "duration"
          ? { minDurationSec, maxDurationSec }
          : { minDurationSec: undefined, maxDurationSec: undefined }),
        audio: v.audio
          ? {
              allowedCodecs: v.audio.allowedCodecs,
              allowedChannels: v.audio.allowedChannels,
              minSampleRateHz,
              maxSampleRateHz,
              minBitrateKbps: minAudioBitrateKbps,
              maxBitrateKbps: maxAudioBitrateKbps,
            }
          : undefined,
      }
    }
    if (values.audio) {
      const a = values.audio
      const [minSampleRateHz, maxSampleRateHz] = a.sampleRateRange || [undefined, undefined]
      const [minBitrateKbps, maxBitrateKbps] = a.bitrateRange || [undefined, undefined]
      const [minDurationSec, maxDurationSec] = a.durationRange || [undefined, undefined]
      constraints.audio = {
        allowedCodecs: a.allowedCodecs,
        allowedChannels: a.allowedChannels,
        minSampleRateHz,
        maxSampleRateHz,
        minBitrateKbps,
        maxBitrateKbps,
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

      <Card>
        <CardHeader>
          <CardTitle>Guided setup</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <Tabs defaultValue="type" className="space-y-6">
              <TabsList>
                <TabsTrigger value="type">Type</TabsTrigger>
                <TabsTrigger value="constraints">Constraints</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
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
                {/* Allowed formats for the chosen kind */}
                <div className="space-y-3">
                  <FormLabel>Allowed formats</FormLabel>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const catId: FileCategoryId =
                          kind === "image" ? "images" : kind === "video" ? "video" : kind === "audio" ? "audio" : ("text" as FileCategoryId)
                        const found = FILE_CATEGORIES.find((c) => c.id === catId)
                        const mimes = found?.mimes ?? []
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

                {/* File size in MB (0-100) */}
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

                {/* Image-only */}
                {useWatch({ control: form.control, name: "kind" }) === "image" ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="image.minWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image min width</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image.minHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image min height</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image.maxWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image max width</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image.maxHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image max height</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                ) : null}

                {/* Video-only */}
                {useWatch({ control: form.control, name: "kind" }) === "video" ? (
                <div className="space-y-4">
                  <div className="text-sm font-medium">Video</div>
                  <div className="space-y-2">
                    <FormLabel>Codecs</FormLabel>
                    <FormField
                      control={form.control}
                      name="video.allowedCodecs"
                      render={({ field }) => (
                        <FormItem>
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
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="video.minFrameRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min FPS</FormLabel>
                          <FormControl>
                            <Slider value={[field.value ?? 0]} onValueChange={(v: number[]) => field.onChange(v[0])} min={0} max={240} step={1} />
                          </FormControl>
                          <div className="text-xs text-muted-foreground">{field.value ?? 0} fps</div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="video.maxFrameRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max FPS</FormLabel>
                          <FormControl>
                            <Slider value={[field.value ?? 60]} onValueChange={(v: number[]) => field.onChange(v[0])} min={1} max={240} step={1} />
                          </FormControl>
                          <div className="text-xs text-muted-foreground">{field.value ?? 60} fps</div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="video.minWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min width</FormLabel>
                          <FormControl>
                            <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="video.minHeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min height</FormLabel>
                          <FormControl>
                            <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="video.maxWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max width</FormLabel>
                          <FormControl>
                            <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="video.maxHeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max height</FormLabel>
                          <FormControl>
                            <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel>Aspect ratios</FormLabel>
                    <FormField
                      control={form.control}
                      name="video.allowedAspectRatios"
                      render={({ field }) => (
                        <FormItem>
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
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="video.bitrateRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video bitrate (kbps)</FormLabel>
                          <FormControl>
                            <Slider value={(field.value as number[] | undefined) ?? [0, 8000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={50000} step={100} />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Min: {field.value?.[0] ?? 0}</span>
                            <span>Max: {field.value?.[1] ?? 8000}</span>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="video.framesRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frames count</FormLabel>
                          <FormControl>
                            <Slider value={(field.value as number[] | undefined) ?? [0, 300000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={1000000} step={100} />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Min: {field.value?.[0] ?? 0}</span>
                            <span>Max: {field.value?.[1] ?? 300000}</span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Choose length mode */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="video.lengthMode"
                      render={({ field }) => (
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
                      )}
                    />
                    {lengthMode === "duration" ? (
                      <FormField
                        control={form.control}
                        name="video.durationRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (seconds)</FormLabel>
                            <FormControl>
                              <Slider value={(field.value as number[] | undefined) ?? [0, 600]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={86400} step={1} />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {field.value?.[0] ?? 0}s</span>
                              <span>Max: {field.value?.[1] ?? 600}s</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    ) : null}
                  </div>

                  {/* Audio sub-track */}
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Audio stream (if present)</div>
                    <FormField
                      control={form.control}
                      name="video.audio.allowedCodecs"
                      render={({ field }) => (
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
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="video.audio.allowedChannels"
                      render={({ field }) => (
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
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="video.audio.sampleRateRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sample rate (Hz)</FormLabel>
                            <FormControl>
                              <Slider value={(field.value as number[] | undefined) ?? [8000, 48000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={8000} max={192000} step={1000} />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {field.value?.[0] ?? 8000}</span>
                              <span>Max: {field.value?.[1] ?? 48000}</span>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="video.audio.bitrateRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Audio bitrate (kbps)</FormLabel>
                            <FormControl>
                              <Slider value={(field.value as number[] | undefined) ?? [0, 320]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={512} step={8} />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {field.value?.[0] ?? 0}</span>
                              <span>Max: {field.value?.[1] ?? 320}</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                ) : null}

                {/* Audio-only */}
                {useWatch({ control: form.control, name: "kind" }) === "audio" ? (
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Audio</div>
                    <FormField
                      control={form.control}
                      name="audio.allowedCodecs"
                      render={({ field }) => (
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
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="audio.allowedChannels"
                      render={({ field }) => (
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
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="audio.sampleRateRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sample rate (Hz)</FormLabel>
                            <FormControl>
                              <Slider value={(field.value as number[] | undefined) ?? [8000, 48000]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={8000} max={192000} step={1000} />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {field.value?.[0] ?? 8000}</span>
                              <span>Max: {field.value?.[1] ?? 48000}</span>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="audio.bitrateRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bitrate (kbps)</FormLabel>
                            <FormControl>
                              <Slider value={(field.value as number[] | undefined) ?? [0, 320]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={2000} step={8} />
                            </FormControl>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {field.value?.[0] ?? 0}</span>
                              <span>Max: {field.value?.[1] ?? 320}</span>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="audio.durationRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (seconds)</FormLabel>
                          <FormControl>
                            <Slider value={(field.value as number[] | undefined) ?? [0, 600]} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={86400} step={1} />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Min: {field.value?.[0] ?? 0}s</span>
                            <span>Max: {field.value?.[1] ?? 600}s</span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="schedule" className="space-y-6">
                <FormField
                  control={form.control}
                  name="opensAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          id="opens"
                          label="Opens"
                          valueIso={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="closesAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closes</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          id="closes"
                          label="Closes"
                          valueIso={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="review" className="space-y-4">
                <p className="text-sm text-muted-foreground">Review your settings then create the form.</p>
                <Button type="button" onClick={onCreate} disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating…" : "Create form"}
                </Button>
              </TabsContent>
            </Tabs>
          </Form>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
}
