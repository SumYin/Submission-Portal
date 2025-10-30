"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getForm, getFormSubmissions } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import AuthGuard from "@/components/auth-guard"

export default function FormDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [title, setTitle] = useState<string>("")
  const [code, setCode] = useState<string>("")
  const [subs, setSubs] = useState<Array<{ id: string; filename: string; status: string; when: string }>>([])

  useEffect(() => {
    ;(async () => {
      const f = await getForm(id)
      if (f) {
        setTitle(f.title)
        setCode(f.code)
      }
      const s = await getFormSubmissions(id)
      setSubs(s.items.map((x) => ({ id: x.id, filename: x.filename, status: x.status, when: new Date(x.createdAt).toLocaleString() })))
    })()
  }, [id])

  return (
    <AuthGuard>
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{title || "Form"}</h1>
        {code ? <Badge variant="secondary">Code: {code}</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions received</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.filename}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                  <TableCell>{r.when}</TableCell>
                </TableRow>
              ))}
              {subs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No submissions yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
}
