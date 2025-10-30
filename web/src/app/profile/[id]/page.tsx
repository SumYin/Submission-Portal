"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getUser, getUserProfile } from "@/lib/api"
import type { Profile, User } from "@/lib/types"

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!id) return
    ;(async () => {
      const [u, p] = await Promise.all([getUser(id), getUserProfile(id)])
      if (!mounted) return
      setUser(u)
      setProfile(p)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="min-h-dvh grid place-items-center">Loading…</div>
  if (!user) return <div className="min-h-dvh grid place-items-center">User not found</div>

  const displayName = (profile?.name && profile.name.trim()) ? profile!.name : user.username

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{displayName}</CardTitle>
          {profile?.description ? (
            <p className="text-sm text-muted-foreground mt-1">{profile.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Username</div>
              <div className="font-medium">{user.username}</div>
            </div>
            {profile?.email ? (
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{profile.email}</div>
              </div>
            ) : null}
            {profile?.phone ? (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{profile.phone}</div>
              </div>
            ) : null}
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            This is a public profile. To edit your own, go to {" "}
            <Link href="/profile" className="underline underline-offset-4">Profile</Link>.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
