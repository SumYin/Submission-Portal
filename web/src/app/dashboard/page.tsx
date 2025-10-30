"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { listMyForms } from "@/lib/api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { exportToJSON } from "@/lib/export"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import AuthGuard from "@/components/auth-guard"

export default function DashboardPage() {
  const [forms, setForms] = useState<Array<{ id: string; title: string; code: string }>>([])
  useEffect(() => {
    ;(async () => setForms((await listMyForms()).map((f) => ({ id: f.id, title: f.title, code: f.code }))))()
  }, [])
  const columns: ColumnDef<(typeof forms)[number]>[] = [
    { accessorKey: "title", header: "Title" },
    { accessorKey: "code", header: "Code", cell: ({ getValue }) => <code className="px-2 py-1 rounded bg-muted text-sm">{String(getValue())}</code> },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="text-right">
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
              toolbar={toolbar}
              enableSearch
              searchPlaceholder="Search forms..."
              searchKeys={["title", "code", "id"]}
              enableColumnVisibility
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
