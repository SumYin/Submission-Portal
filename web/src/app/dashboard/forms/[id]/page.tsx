"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getForm, getFormSubmissions } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { exportToJSON, downloadFakeFile, downloadZipPlaceholder } from "@/lib/export"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AuthGuard from "@/components/auth-guard"

export default function FormDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [title, setTitle] = useState<string>("")
  const [code, setCode] = useState<string>("")
  const [subs, setSubs] = useState<Array<{ id: string; filename: string; status: string; when: string }>>([])

  useEffect(() => {
    if (!id) return
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

  const columns: ColumnDef<(typeof subs)[number]>[] = [
    { accessorKey: "filename", header: "File" },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
    { accessorKey: "when", header: "When" },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" variant="outline" onClick={() => downloadFakeFile(row.original.filename, { id: row.original.id, formCode: code })}>Download</Button>
      </div>
    ) },
  ]

  const [selected, setSelected] = useState<(typeof subs)[number][]>([])

  const toolbar = (
    <div className="ml-auto flex items-center gap-2">
      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => exportToJSON(`form-${code || ""}-submissions.json`, subs)}>Download JSON</Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={selected.length === 0}
          onClick={() =>
            downloadZipPlaceholder(
              `form-${code || ""}-selected`,
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
            <DropdownMenuItem onClick={() => exportToJSON(`form-${code || ""}-submissions.json`, subs)}>
              Download JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={selected.length === 0}
              onClick={() =>
                downloadZipPlaceholder(
                  `form-${code || ""}-selected`,
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
            <DataTable
              columns={columns}
              data={subs}
              enableSelection
              toolbar={toolbar}
              onSelectionChange={setSelected}
              enableSearch
              searchPlaceholder="Search submissions..."
              searchKeys={["filename", "status", "when"]}
              enableColumnVisibility
            />
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
