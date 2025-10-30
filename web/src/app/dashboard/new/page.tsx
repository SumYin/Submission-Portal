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

const mimeOptions = [
  { label: "JPEG", value: "image/jpeg" },
  { label: "PNG", value: "image/png" },
  { label: "WEBP", value: "image/webp" },
  { label: "MP4", value: "video/mp4" },
  { label: "MOV", value: "video/quicktime" },
]

// Keep form values as strings where inputs are text/number, parse on submit for simpler types
const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  allowedTypes: z.array(z.string()).default([]),
  minSizeBytes: z.string().optional(),
  maxSizeBytes: z.string().optional(),
  image: z
    .object({
      minWidth: z.string().optional(),
      minHeight: z.string().optional(),
      maxWidth: z.string().optional(),
      maxHeight: z.string().optional(),
    })
    .optional(),
  video: z
    .object({
      minFrameRate: z.string().optional(),
      maxFrameRate: z.string().optional(),
      minWidth: z.string().optional(),
      minHeight: z.string().optional(),
      maxWidth: z.string().optional(),
      maxHeight: z.string().optional(),
    })
    .optional(),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
})

export default function NewFormPage() {
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({
    // Cast to align resolver input/output typing for zod + RHF
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: "",
      description: "",
      allowedTypes: ["image/jpeg", "image/png"],
    },
  })

  const parseNum = (s?: string) => (s && s.trim() !== "" ? Number(s) : undefined)

  const onCreate = async () => {
    const values = form.getValues()
    const constraints: any = {
      allowedTypes: values.allowedTypes,
      minSizeBytes: parseNum(values.minSizeBytes),
      maxSizeBytes: parseNum(values.maxSizeBytes),
    }
    if (values.image) {
      constraints.image = {
        minWidth: parseNum(values.image.minWidth),
        minHeight: parseNum(values.image.minHeight),
        maxWidth: parseNum(values.image.maxWidth),
        maxHeight: parseNum(values.image.maxHeight),
      }
    }
    if (values.video) {
      constraints.video = {
        minFrameRate: parseNum(values.video.minFrameRate),
        maxFrameRate: parseNum(values.video.maxFrameRate),
        minWidth: parseNum(values.video.minWidth),
        minHeight: parseNum(values.video.minHeight),
        maxWidth: parseNum(values.video.maxWidth),
        maxHeight: parseNum(values.video.maxHeight),
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
                      <FormLabel>Title</FormLabel>
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
                <div className="space-y-2">
                  <FormLabel>Allowed file types</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {mimeOptions.map((opt) => (
                      <FormField
                        key={opt.value}
                        control={form.control}
                        name="allowedTypes"
                        render={({ field }) => {
                          const checked = field.value?.includes(opt.value)
                          return (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    if (v) field.onChange([...(field.value ?? []), opt.value])
                                    else field.onChange((field.value ?? []).filter((x: string) => x !== opt.value))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{opt.label}</FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minSizeBytes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min size (bytes)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxSizeBytes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max size (bytes)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="104857600" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="image.minWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image min width</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
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
                          <Input type="number" placeholder="" {...field} />
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
                          <Input type="number" placeholder="" {...field} />
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
                          <Input type="number" placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="video.minFrameRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video min FPS</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="video.maxFrameRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video max FPS</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="video.minWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video min width</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
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
                        <FormLabel>Video min height</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
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
                        <FormLabel>Video max width</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
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
                        <FormLabel>Video max height</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <FormField
                  control={form.control}
                  name="opensAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens at (ISO)</FormLabel>
                      <FormControl>
                        <Input placeholder="2025-01-31T09:00:00Z" {...field} />
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
                      <FormLabel>Closes at (ISO)</FormLabel>
                      <FormControl>
                        <Input placeholder="2025-02-10T17:00:00Z" {...field} />
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
  )
}
