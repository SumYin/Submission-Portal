"use client"

import { useEffect, useState, useCallback } from "react"
import { getCurrentUser, signOut as apiSignOut } from "./api"
import type { User } from "./types"
import { onAuthChanged } from "./auth-events"

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const u = await getCurrentUser()
      setUser(u)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    refresh()
    // Also listen for storage changes (sign-in/out from another tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("sp.")) refresh()
    }
    window.addEventListener("storage", onStorage)
    // And listen for in-tab auth change events
    const offAuth = onAuthChanged(() => refresh())
    return () => {
      window.removeEventListener("storage", onStorage)
      offAuth()
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    await apiSignOut()
    await refresh()
  }, [refresh])

  return { user, loading, refresh, signOut }
}
