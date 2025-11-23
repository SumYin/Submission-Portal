"use client"

import { useCallback, useMemo } from "react"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form as UIForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { FILE_CATEGORIES, FileCategoryId, VIDEO_CODECS, AUDIO_CODECS, AUDIO_CHANNELS } from "@/lib/fileTaxonomy"
import CustomExtensionsInput from "./custom-extensions-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Calendar05 from "@/components/calendar-05"
import { type DateRange } from "react-day-picker"
import { endOfDay, startOfDay } from "date-fns"

export const formSchema = z.object({
  title: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  kind: z.enum(["video", "image", "audio", "other"]),
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
      bitrateRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
      durationRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
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

export type FormValues = z.infer<typeof formSchema>

interface FormEditorProps {
  initialValues?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<void>
  isSubmitting?: boolean
  mode: "create" | "edit"
  onCancel?: () => void
}

export default function FormEditor({ initialValues, onSubmit, isSubmitting, mode, onCancel }: FormEditorProps) {
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      kind: "image",
      allowedMimes: [],
      customExtensions: [],
      sizeMB: [0, 100],
      opensAt: undefined,
      closesAt: undefined,
      ...initialValues,
    },
  })

  const kind = useWatch({ control: form.control, name: "kind" })
  const allowedMimesVal = useWatch({ control: form.control, name: "allowedMimes" }) as string[] | undefined
  const customExtensionsVal = useWatch({ control: form.control, name: "customExtensions" }) as string[] | undefined
  const opensAtVal = useWatch({ control: form.control, name: "opensAt" })
  const closesAtVal = useWatch({ control: form.control, name: "closesAt" })

  const scheduleRange = useMemo(() => {
    const from = opensAtVal ? new Date(opensAtVal) : undefined
    const to = closesAtVal ? new Date(closesAtVal) : undefined
    if (!from && !to) return undefined
    if (from && to) {
      const [start, end] = from > to ? [to, from] : [from, to]
      return { from: start, to: end }
    }
    const single = from ?? to
    return single ? { from: single, to: single } : undefined
  }, [opensAtVal, closesAtVal])

  const scheduleSummary = useMemo(() => {
    if (!scheduleRange?.from) return "No open or close date limits"
    const fromLabel = scheduleRange.from.toLocaleDateString()
    const toLabel = scheduleRange.to ? scheduleRange.to.toLocaleDateString() : fromLabel
    return fromLabel === toLabel ? `Opens on ${fromLabel}` : `${fromLabel} – ${toLabel}`
  }, [scheduleRange])

  const setScheduleRange = useCallback(
    (range?: DateRange) => {
      if (!range?.from && !range?.to) {
        form.setValue("opensAt", undefined, { shouldDirty: true, shouldTouch: true })
        form.setValue("closesAt", undefined, { shouldDirty: true, shouldTouch: true })
        return
      }
      const normalizedFrom = range.from
      const normalizedTo = range.to ?? range.from
      const [rawStart, rawEnd] = normalizedFrom && normalizedTo && normalizedFrom > normalizedTo
        ? [normalizedTo, normalizedFrom]
        : [normalizedFrom, normalizedTo]
      const start = rawStart ? startOfDay(rawStart) : undefined
      const end = rawEnd ? endOfDay(rawEnd) : undefined
      form.setValue("opensAt", start ? start.toISOString() : undefined, { shouldDirty: true, shouldTouch: true })
      form.setValue("closesAt", end ? end.toISOString() : undefined, { shouldDirty: true, shouldTouch: true })
    },
    [form],
  )

  const clearSchedule = useCallback(() => {
    form.setValue("opensAt", undefined, { shouldDirty: true, shouldTouch: true })
    form.setValue("closesAt", undefined, { shouldDirty: true, shouldTouch: true })
  }, [form])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guided setup</CardTitle>
      </CardHeader>
      <CardContent>
        <UIForm {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
                          <FormField control={form.control} name="video.durationRange" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (seconds)</FormLabel>
                              <FormControl>
                                <div className="flex gap-4">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-xs text-muted-foreground">Min</span>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min={0}
                                      value={field.value?.[0] ?? 0}
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                                        field.onChange([val, field.value?.[1] ?? 0])
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <span className="text-xs text-muted-foreground">Max</span>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min={0}
                                      value={field.value?.[1] ?? 0}
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                                        field.onChange([field.value?.[0] ?? 0, val])
                                      }}
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
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
                              <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                  <span className="text-xs text-muted-foreground">Min</span>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={field.value?.[0] ?? 0}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                                      field.onChange([val, field.value?.[1] ?? 0])
                                    }}
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <span className="text-xs text-muted-foreground">Max</span>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={field.value?.[1] ?? 0}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                                      field.onChange([field.value?.[0] ?? 0, val])
                                    }}
                                  />
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-6">
                    <FormField
                      control={form.control}
                      name="opensAt"
                      render={({ field: _field }) => (
                        <FormItem className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                              <FormLabel className="text-base">Availability window</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Choose optional open and close dates. Leave blank to accept submissions anytime.
                              </p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={clearSchedule} disabled={!scheduleRange}>
                              Clear
                            </Button>
                          </div>
                          <FormControl>
                            <Calendar05 value={scheduleRange} onChange={setScheduleRange} />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">{scheduleSummary}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="review" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {mode === "create" ? "Review your settings then create the form." : "Review your changes, then save."}
                    </p>
                    {mode === "create" && (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Creating…" : "Create form"}
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>

                {mode === "edit" && (
                  <div className="flex gap-2 justify-end">
                    {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
                    <Button type="submit" disabled={isSubmitting}>Save</Button>
                  </div>
                )}
          </form>
        </UIForm>
      </CardContent>
    </Card>
  )
}
