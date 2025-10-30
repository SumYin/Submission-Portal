"use client"

import { useEffect, useState } from "react"
import { listMySubmissions, getForm } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function MySubmissionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; formTitle: string; filename: string; status: string; when: string }>>([])

  useEffect(() => {
    ;(async () => {
      const subs = await listMySubmissions()
      const withForm = await Promise.all(
        subs.map(async (s) => ({
          id: s.id,
          formTitle: (await getForm(s.formId))?.title ?? s.formId,
          filename: s.filename,
          status: s.status,
          when: new Date(s.createdAt).toLocaleString(),
        }))
      )
      setRows(withForm)
    })()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>My submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.formTitle}</TableCell>
                  <TableCell>{r.filename}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                  <TableCell>{r.when}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No submissions yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
