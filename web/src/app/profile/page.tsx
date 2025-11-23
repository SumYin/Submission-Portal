"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { getProfile, updateProfile, deleteAccount } from "@/lib/api"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import AuthGuard from "@/components/auth-guard"

const schema = z.object({
  displayName: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
})

export default function ProfilePage() {
  const router = useRouter()
  const [username, setUsername] = useState("")

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", bio: "", email: "", phone: "" },
  })

  useEffect(() => {
    ; (async () => {
      const p = await getProfile()
      setUsername(p.name || "")
      form.reset({
        displayName: p.displayName ?? "",
        bio: p.bio ?? p.description ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
      })
    })()
  }, [])

  const onSave = async (values: z.infer<typeof schema>) => {
    try {
      await updateProfile({ ...values, email: values.email || undefined })
      toast.success("Profile saved")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile")
    }
  }

  const onDelete = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return
    try {
      await deleteAccount()
      toast.success("Account deleted")
      router.push("/")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account")
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSave)}>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Username</label>
                  <Input value={username} disabled className="bg-muted" />
                  <p className="text-[0.8rem] text-muted-foreground">Username cannot be changed.</p>
                </div>

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="About you" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+34 600 000 000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-between items-center pt-4">
                  <Button type="button" variant="destructive" onClick={onDelete}>Delete Account</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
