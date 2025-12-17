"use client"

import { useEffect, useState } from "react"
import { getFormSubmissions, listMyForms, deleteForm } from "@/lib/api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { exportToJSON } from "@/lib/export"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import Link from "next/link"

export default function DashboardPage() {
  const [forms, setForms] = useState<Array<{ id: string; title: string; code: string; createdAt: string; submissions: number }>>([])
  const [selected, setSelected] = useState<Array<{ id: string }>>([])
  useEffect(() => {
    ;(async () => {
      const mine = await listMyForms()
      const rows = await Promise.all(
        mine.map(async (f) => ({
          id: f.id,
          title: f.title,
          code: f.code,
          createdAt: f.createdAt,
          submissions: (await getFormSubmissions(f.id)).total,
        }))
      )
      setForms(rows)
    })()
  }, [])
  const columns: ColumnDef<(typeof forms)[number]>[] = [
    { accessorKey: "title", header: "Title" },
    { accessorKey: "code", header: "Code", cell: ({ getValue }) => <code className="px-2 py-1 rounded bg-muted text-sm">{String(getValue())}</code> },
    { accessorKey: "submissions", header: "Submissions" },
    { id: "createdAt", accessorFn: (r) => r.createdAt, header: "Created", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString() },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/forms/${row.original.id}/edit`}>Edit</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href={`/dashboard/forms/${row.original.id}`}>View</Link>
        </Button>
      </div>
    ) },
  ]

  const toolbar = (
    <div className="ml-auto flex items-center gap-2">
      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => exportToJSON("my-forms.json", forms)}>Download JSON</Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={selected.length === 0}
          onClick={async () => {
            if (selected.length === 0) return
            if (!window.confirm(`Delete ${selected.length} form(s)? This will remove all their submissions.`)) return
            await Promise.all(selected.map((r) => deleteForm((r as any).id)))
            setForms((prev) => prev.filter((f) => !selected.some((s) => (s as any).id === f.id)))
          }}
        >
          Delete selected
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
            <DropdownMenuItem onClick={() => exportToJSON("my-forms.json", forms)}>
              Download JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={selected.length === 0}
              onClick={async () => {
                if (selected.length === 0) return
                if (!window.confirm(`Delete ${selected.length} form(s)? This will remove all their submissions.`)) return
                await Promise.all(selected.map((r) => deleteForm((r as any).id)))
                setForms((prev) => prev.filter((f) => !selected.some((s) => (s as any).id === f.id)))
              }}
            >
              Delete selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <AuthGuard>
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
            <DataTable
              columns={columns}
              data={forms}
              enableSelection
              onSelectionChange={setSelected as any}
              toolbar={toolbar}
              enableSearch
              searchPlaceholder="Search forms..."
              searchKeys={["title", "code", "id"]}
              enableColumnVisibility
              getRowId={(row) => row.id}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild>
              <Link href="/dashboard/new">Create form</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AuthGuard>
  )
}
