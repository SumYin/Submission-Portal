"use client"

import { useEffect, useState } from "react"
import { listMySubmissions, getForm } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { exportToJSON, downloadFakeFile, downloadZipPlaceholder } from "@/lib/export"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AuthGuard from "@/components/auth-guard"

export default function MySubmissionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; formTitle: string; filename: string; status: string; when: string }>>([])
  const [selected, setSelected] = useState<Array<{ id: string; formTitle: string; filename: string; status: string; when: string }>>([])

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

  const columns: ColumnDef<(typeof rows)[number]>[] = [
    { accessorKey: "formTitle", header: "Form" },
    { accessorKey: "filename", header: "File" },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
    { accessorKey: "when", header: "When" },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" variant="outline" onClick={() => downloadFakeFile(row.original.filename, { id: row.original.id, source: "submissions" })}>Download</Button>
      </div>
    ) },
  ]

  const toolbar = (
    <div className="ml-auto flex items-center gap-2">
      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => exportToJSON("my-submissions.json", rows)}>Download JSON</Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={selected.length === 0}
          onClick={() =>
            downloadZipPlaceholder(
              "my-submissions-selected",
              selected.map((s) => ({ filename: s.filename, id: s.id }))
            )
          }
        >
          ZIP selected (placeholder)
        </Button>
      </div>
      {/* Mobile compact menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" aria-label="Actions">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToJSON("my-submissions.json", rows)}>
              Download JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={selected.length === 0}
              onClick={() =>
                downloadZipPlaceholder(
                  "my-submissions-selected",
                  selected.map((s) => ({ filename: s.filename, id: s.id }))
                )
              }
            >
              ZIP selected (placeholder)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>My submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={rows}
              enableSelection
              toolbar={toolbar}
              onSelectionChange={setSelected}
              enableSearch
              searchPlaceholder="Search submissions..."
              searchKeys={["formTitle", "filename", "status", "when"]}
              enableColumnVisibility
            />
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
