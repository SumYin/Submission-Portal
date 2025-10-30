"use client"

import { z } from "zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { FILE_CATEGORIES, FileCategoryId, mimesForCategories, VIDEO_CODECS, AUDIO_CODECS, AUDIO_CHANNELS, ASPECT_RATIOS } from "@/lib/fileTaxonomy"
import { Checkbox } from "@/components/ui/checkbox"
import { Button as UIButton } from "@/components/ui/button"
import CustomExtensionsInput from "../../../_components/custom-extensions-input"

const schema = z.object({
  title: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  allowAllTypes: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  customExtensions: z.array(z.string()).default([]),
  sizeRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
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
})

export default function EditFormPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) as any, defaultValues: { title: "", description: "", allowAllTypes: false, categories: [], customExtensions: [] } })

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const f = await getForm(id)
      if (!f) return
      // Map existing constraints into UI model
      const cats: string[] = []
      // naive reverse map: if an entire category's mimes are included, tick it
      for (const c of FILE_CATEGORIES) {
        const m = new Set(f.constraints.allowedTypes || [])
        const allIn = c.mimes.every((mm) => m.has(mm))
        if (allIn) cats.push(c.id)
      }
      form.reset({
        title: f.title,
        description: f.description ?? "",
        allowAllTypes: !!f.constraints.allowAllTypes,
        categories: cats,
        customExtensions: f.constraints.allowedExtensions || [],
        sizeRange: [f.constraints.minSizeBytes ?? 0, f.constraints.maxSizeBytes ?? 0],
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
      })
    })()
  }, [id])

  const onSave = async (values: z.infer<typeof schema>) => {
    try {
      const selectedMimes = mimesForCategories((values.categories as FileCategoryId[]))
      const [minSizeBytes, maxSizeBytes] = values.sizeRange || [undefined, undefined]
      const payload: any = {
        title: values.title,
        description: values.description || undefined,
        constraints: {
          allowAllTypes: values.allowAllTypes,
          allowedTypes: values.allowAllTypes ? undefined : selectedMimes,
          allowedExtensions: values.allowAllTypes ? undefined : values.customExtensions,
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
                minFrames: values.video.framesRange?.[0],
                maxFrames: values.video.framesRange?.[1],
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
        },
      }
      await updateForm(id, payload)
      toast.success("Form updated. New constraints apply to future submissions only.")
      router.push(`/dashboard/forms/${id}`)
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update form")
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Edit form</h1>
        <Card>
          <CardHeader>
            <CardTitle>Basic settings</CardTitle>
          </CardHeader>
          <CardContent>
            <UIForm {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSave)}>
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

                {/* Constraints (mirrors create page) */}
                <div className="space-y-4">
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
                      <div className="flex flex-wrap gap-2">
                        {FILE_CATEGORIES.map((c) => {
                          const selected = form.watch("categories").includes(c.id)
                          return (
                            <UIButton
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
                            </UIButton>
                          )
                        })}
                      </div>
                      <CustomExtensionsInput values={form.watch("customExtensions")} onChange={(vals) => form.setValue("customExtensions", vals)} />
                    </div>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="sizeRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File size (bytes)</FormLabel>
                        <FormControl>
                          <Slider value={field.value as number[] | undefined} onValueChange={(v: number[]) => field.onChange(v as [number, number])} min={0} max={1024 * 1024 * 1024} step={1024 * 1024} />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Min: {field.value?.[0] ?? 0}</span>
                          <span>Max: {field.value?.[1] ?? 0}</span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image fields */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Video fields (summary) */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Video</div>
                  <FormField control={form.control} name="video.allowedCodecs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codecs</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_CODECS.map((c) => {
                          const selected = (field.value || []).includes(c)
                          return (
                            <UIButton key={c} type="button" variant={selected ? "default" : "outline"} size="sm" onClick={() => {
                              const set = new Set(field.value || [])
                              selected ? set.delete(c) : set.add(c)
                              field.onChange(Array.from(set))
                            }}>{c.toUpperCase()}</UIButton>
                          )
                        })}
                      </div>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
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
                </div>

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
