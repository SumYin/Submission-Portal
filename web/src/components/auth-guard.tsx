"use client"

import { ReactNode, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/auth"

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || "/")
      router.replace(`/sign-in?next=${next}`)
    }
  }, [loading, user, router, pathname])

  if (loading) return null
  if (!user) return null
  return <>{children}</>
}
