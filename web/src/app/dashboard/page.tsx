"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { listMyForms } from "@/lib/api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DashboardPage() {
  const [forms, setForms] = useState<Array<{ id: string; title: string; code: string }>>([])
  useEffect(() => {
    ;(async () => setForms((await listMyForms()).map((f) => ({ id: f.id, title: f.title, code: f.code }))))()
  }, [])
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/new">Create form</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your forms</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Code</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.title}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 rounded bg-muted text-sm">{f.code}</code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/dashboard/forms/${f.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No forms yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-end">
          <Button asChild>
            <Link href="/dashboard/new">Create form</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
