"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { signUp } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"

import { Suspense } from "react"

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
})

function SignUpForm() {
  const router = useRouter()
  const params = useSearchParams()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  })

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await signUp({ username: values.username, password: values.password })
      toast.success("Account created")
      const next = params?.get("next") || "/"
      router.push(next)
    } catch (e: unknown) {
      const err = e as Error
      toast.error(err?.message ?? "Failed to sign up")
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Choose a username and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="jane" autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link href={`/sign-in${params?.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="underline">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh grid place-items-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Choose a username and password.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] animate-pulse bg-muted/20 rounded-md" />
        </Card>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
