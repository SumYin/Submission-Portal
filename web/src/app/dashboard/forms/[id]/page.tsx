"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getForm, getFormSubmissions, getUser, getUserProfile, deleteSubmission, deleteForm } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { exportToJSON, downloadFile, downloadZipPlaceholder } from "@/lib/export"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import Link from "next/link"

export default function FormDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const [title, setTitle] = useState<string>("")
  const [code, setCode] = useState<string>("")
  const [subs, setSubs] = useState<Array<{ id: string; filename: string; status: string; when: string; whenIso: string; submitterId?: string; submitterName?: string }>>([])
  const [owner, setOwner] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (!id) return
      ; (async () => {
        const f = await getForm(id)
        if (f) {
          setTitle(f.title)
          setCode(f.code)
          const [u, p] = await Promise.all([getUser(f.createdBy), getUserProfile(f.createdBy)])
          const name = (p?.name && p.name.trim()) ? p!.name! : (u?.username ?? f.createdBy)
          setOwner({ id: u?.id ?? f.createdBy, name })
        }
        const s = await getFormSubmissions(id)
        const rows = await Promise.all(s.items.map(async (x) => {
          let submitterName: string | undefined
          let submitterId: string | undefined
          if (x.submittedBy) {
            const [su, sp] = await Promise.all([getUser(x.submittedBy), getUserProfile(x.submittedBy)])
            submitterName = (sp?.name && sp.name.trim()) ? sp!.name! : (su?.username ?? x.submittedBy)
            submitterId = su?.id ?? x.submittedBy
          }
          return {
            id: x.id,
            filename: x.filename,
            status: x.status,
            when: new Date(x.createdAt).toLocaleString(),
            whenIso: x.createdAt,
            submitterId,
            submitterName,
          }
        }))
        setSubs(rows.sort((a, b) => b.whenIso.localeCompare(a.whenIso)))
      })()
  }, [id])

  const columns: ColumnDef<(typeof subs)[number]>[] = [
    { accessorKey: "filename", header: "File" },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span> },
    { id: "when", accessorFn: (r) => r.whenIso, header: "When", cell: ({ row }) => row.original.when },
    {
      id: "submitter",
      header: "Submitted by",
      cell: ({ row }) => (
        row.original.submitterId ? (
          <Link href={`/profile/${row.original.submitterId}`} className="underline underline-offset-4">
            {row.original.submitterName}
          </Link>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        )
      )
    },
    {
      id: "actions", header: "", cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="outline" onClick={() => downloadFile(row.original.id, row.original.filename)}>Download</Button>
        </div>
      )
    },
  ]

  const [selected, setSelected] = useState<(typeof subs)[number][]>([])

  const toolbar = (
    <div className="ml-auto flex items-center gap-2">
      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => exportToJSON(`form-${code || ""}-submissions.json`, subs)}>Download JSON</Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={selected.length === 0}
          onClick={async () => {
            if (selected.length === 0) return
            if (!window.confirm(`Remove ${selected.length} submission(s)?`)) return
            await Promise.all(selected.map((s) => deleteSubmission(s.id)))
            setSubs((prev) => prev.filter((r) => !selected.some((s) => s.id === r.id)))
            setSelected([])
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
              onClick={async () => {
                if (selected.length === 0) return
                if (!window.confirm(`Remove ${selected.length} submission(s)?`)) return
                await Promise.all(selected.map((s) => deleteSubmission(s.id)))
                setSubs((prev) => prev.filter((r) => !selected.some((s) => s.id === r.id)))
                setSelected([])
              }}
            >
              Delete selected
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
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href={`/dashboard/forms/${id}/edit`}>Edit</Link>
          </Button>
        </div>
        {owner ? (
          <div className="text-sm text-muted-foreground">
            Created by {" "}
            <Link href={`/profile/${owner.id}`} className="underline underline-offset-4">{owner.name}</Link>
          </div>
        ) : null}

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
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={async () => {
              if (!id) return
              if (!window.confirm("Delete this form and all its submissions?")) return
              await deleteForm(id)
              window.location.href = "/dashboard"
            }}
          >
            Delete form
          </Button>
        </div>
      </div>
    </AuthGuard>
  )
}
