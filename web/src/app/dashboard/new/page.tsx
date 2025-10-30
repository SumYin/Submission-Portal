"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createForm } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import AuthGuard from "@/components/auth-guard"
import { Slider } from "@/components/ui/slider"
import { FILE_CATEGORIES, FileCategoryId, mimesForCategories, VIDEO_CODECS, AUDIO_CODECS, AUDIO_CHANNELS, ASPECT_RATIOS } from "@/lib/fileTaxonomy"
import { Badge } from "@/components/ui/badge"
import CustomExtensionsInput from "../_components/custom-extensions-input"
import { DateTimePicker } from "@/components/ui/date-time-picker"

// Form schema for creation UI
const schema = z.object({
  title: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  allowAllTypes: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  customExtensions: z.array(z.string()).default([]),
  sizeRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(), // [minBytes, maxBytes]
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
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
})

export default function NewFormPage() {
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({
    // Cast resolver to avoid strict generic incompatibilities
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: "",
      description: "",
      allowAllTypes: false,
      categories: ["images", "video"] as string[],
      customExtensions: [],
      sizeRange: [0, 104857600], // 0 - 100MB
      video: {
        allowedCodecs: ["h264"],
        allowedAspectRatios: ["16:9"],
      },
    },
  })

  const onCreate = async () => {
    const values = form.getValues()
    const selectedMimes = mimesForCategories((values.categories as FileCategoryId[]))
    const [minSizeBytes, maxSizeBytes] = values.sizeRange || [undefined, undefined]
    const constraints: any = {
      allowAllTypes: values.allowAllTypes,
      allowedTypes: values.allowAllTypes ? undefined : selectedMimes,
      allowedExtensions: values.allowAllTypes ? undefined : values.customExtensions,
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
        minFrames,
        maxFrames,
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
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create form")
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
            <Tabs defaultValue="details" className="space-y-6">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="constraints">Constraints</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="constraints" className="space-y-6">
                {/* General */}
                <div className="space-y-3">
                  <FormLabel>Files allowed</FormLabel>
                  <FormField
                    control={form.control}
                    name="allowAllTypes"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                        </FormControl>
                        <FormLabel className="font-normal">Allow all file types</FormLabel>
                      </FormItem>
                    )}
                  />
                  {!form.watch("allowAllTypes") ? (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Presets</div>
                      <div className="flex flex-wrap gap-2">
                        {FILE_CATEGORIES.map((c) => {
                          const selected = form.watch("categories").includes(c.id)
                          return (
                            <Button
                              key={c.id}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const cur = new Set(form.getValues("categories"))
                                if (selected) cur.delete(c.id)
                                else cur.add(c.id)
                                form.setValue("categories", Array.from(cur))
                              }}
                            >
                              {c.label}
                            </Button>
                          )
                        })}
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Custom extensions</div>
                        <CustomExtensionsInput
                          values={form.watch("customExtensions")}
                          onChange={(vals) => form.setValue("customExtensions", vals)}
                        />
                        <div className="text-xs text-muted-foreground">Examples: .txt, .md, .py, .json</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Effective MIME types: {mimesForCategories(form.watch("categories") as FileCategoryId[]).join(", ") || "(none)"}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <FormLabel>File size (bytes)</FormLabel>
                    <FormField
                      control={form.control}
                      name="sizeRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Slider
                              value={field.value as number[]}
                              onValueChange={(v: number[]) => field.onChange(v as [number, number])}
                              min={0}
                              max={1024 * 1024 * 1024}
                              step={1024 * 1024}
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Min: {field.value?.[0] ?? 0}</span>
                            <span>Max: {field.value?.[1] ?? 0}</span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

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

                {/* Video */}
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
                                  selected ? set.delete(c) : set.add(c)
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
                                  selected ? set.delete(ar) : set.add(ar)
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
                                  selected ? set.delete(c) : set.add(c)
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
                                  selected ? set.delete(ch) : set.add(ch)
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
