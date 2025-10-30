"use client"

import { useEffect, useState } from "react"
import { listMySubmissions, getForm, getUser, getUserProfile, deleteSubmission } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { exportToJSON, downloadFakeFile, downloadZipPlaceholder } from "@/lib/export"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AuthGuard from "@/components/auth-guard"

export default function MySubmissionsPage() {
  const [rows, setRows] = useState<Array<{ id: string; formTitle: string; filename: string; status: string; when: string; whenIso: string; ownerId?: string; ownerName?: string }>>([])
  const [selected, setSelected] = useState<Array<{ id: string; formTitle: string; filename: string; status: string; when: string }>>([])

  useEffect(() => {
    ;(async () => {
      const subs = await listMySubmissions()
      const withForm = await Promise.all(
        subs.map(async (s) => {
          const f = await getForm(s.formId)
          let ownerId: string | undefined
          let ownerName: string | undefined
          if (f) {
            const [u, p] = await Promise.all([getUser(f.createdBy), getUserProfile(f.createdBy)])
            ownerId = u?.id ?? f.createdBy
            ownerName = (p?.name && p.name.trim()) ? p!.name! : (u?.username ?? f.createdBy)
          }
          const createdAt = s.createdAt
          return {
            id: s.id,
            formTitle: f?.title ?? s.formId,
            filename: s.filename,
            status: s.status,
            when: new Date(createdAt).toLocaleString(),
            whenIso: createdAt,
            ownerId,
            ownerName,
          }
        })
      )
      setRows(withForm.sort((a, b) => b.whenIso.localeCompare(a.whenIso)))
    })()
  }, [])

  const columns: ColumnDef<(typeof rows)[number]>[] = [
    { accessorKey: "formTitle", header: "Form" },
    { accessorKey: "filename", header: "File" },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
    { id: "when", accessorFn: (r) => r.whenIso, header: "When", cell: ({ row }) => row.original.when },
    { id: "owner", header: "Owner", cell: ({ row }) => row.original.ownerId ? (
      <a href={`/profile/${row.original.ownerId}`} className="underline underline-offset-4">{row.original.ownerName}</a>
    ) : <span className="text-muted-foreground">Unknown</span> },
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
          variant="destructive"
          disabled={selected.length === 0}
          onClick={async () => {
            if (selected.length === 0) return
            if (!window.confirm(`Delete ${selected.length} submission(s)?`)) return
            await Promise.all(selected.map((s) => deleteSubmission((s as any).id)))
            setRows((prev) => prev.filter((r) => !selected.some((s) => (s as any).id === r.id)))
          }}
        >
          Delete selected
        </Button>
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
              onClick={async () => {
                if (selected.length === 0) return
                if (!window.confirm(`Delete ${selected.length} submission(s)?`)) return
                await Promise.all(selected.map((s) => deleteSubmission((s as any).id)))
                setRows((prev) => prev.filter((r) => !selected.some((s) => (s as any).id === r.id)))
              }}
            >
              Delete selected
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
