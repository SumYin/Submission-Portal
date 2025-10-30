"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PinInput } from "@/components/pin-input"
import { validateFormCode } from "@/lib/api"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

export default function Home() {
  const [code, setCode] = useState("")
  // no explicit loading UI; we auto-advance on complete and show dialog on error
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const router = useRouter()

  const submit = async (raw?: string) => {
    const source = raw ?? code
    const trimmed = source.replace(/\s/g, "").slice(0, 6)
    if (trimmed.length < 6) {
      setErrorMsg("Please enter a 6-character code.")
      setErrorOpen(true)
      return
    }
    try {
      const res = await validateFormCode(trimmed)
      if (res.ok && res.form) {
        router.push(`/submit/${trimmed}`)
      } else {
        setErrorMsg(res.reason || "That code didn’t work. Please try again.")
        setErrorOpen(true)
      }
    } finally {
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Submit with code</CardTitle>
          <CardDescription>
            Enter the 6-character invitation code you received to upload your file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PinInput value={code} onChangeAction={setCode} onCompleteAction={(val) => submit(val)} />
          <div className="text-sm text-muted-foreground space-x-2">
            <Link href="/sign-in" className="underline">Sign in</Link>
            <span>·</span>
            <Link href="/sign-up" className="underline">Sign up</Link>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={errorOpen} onOpenChange={setErrorOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Invalid code</AlertDialogTitle>
          <AlertDialogDescription>
            {errorMsg}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
