"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowUpDown } from "lucide-react"

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableSelection?: boolean
  toolbar?: React.ReactNode
  onSelectionChange?: (selectedRows: TData[]) => void
  enableSearch?: boolean
  searchPlaceholder?: string
  searchKeys?: string[]
  enableColumnVisibility?: boolean
  getRowId?: (originalRow: TData, index: number, parent?: any) => string
}

export function DataTable<TData extends Record<string, any>, TValue>({ columns, data, enableSelection, toolbar, onSelectionChange, enableSearch, searchPlaceholder = "Search...", searchKeys, enableColumnVisibility, getRowId }: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [query, setQuery] = React.useState("")

  const columnsWithSelection = React.useMemo(() => {
    if (!enableSelection) return columns
    const selCol: ColumnDef<TData, any> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      size: 32,
      maxSize: 32,
    }
    return [selCol, ...columns]
  }, [columns, enableSelection])

  const filteredData = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    const keys = searchKeys && searchKeys.length > 0 ? searchKeys : Object.keys(data[0] ?? {})
    return data.filter((row) =>
      keys.some((k) => {
        const v = row?.[k]
        if (v == null) return false
        return String(v).toLowerCase().includes(q)
      })
    )
  }, [data, query, searchKeys])

  const table = useReactTable({
    data: filteredData,
    columns: columnsWithSelection,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  })

  React.useEffect(() => {
    if (!onSelectionChange) return
    const selected = table.getSelectedRowModel().flatRows.map((r) => r.original as TData)
    onSelectionChange(selected)
  }, [rowSelection, onSelectionChange, table])

  const hasControls = enableSearch || enableColumnVisibility || toolbar

  return (
    <div className="w-full space-y-3">
      {hasControls ? (
        <div className="flex items-center justify-between gap-2 flex-wrap gap-y-2">
          <div className="flex items-center gap-2">
            {enableSearch ? (
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-40 sm:w-56"
              />
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {enableColumnVisibility ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Columns</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table.getAllLeafColumns().filter((c) => c.id !== "select").map((column) => {
                    const id = column.id
                    const title = typeof column.columnDef.header === "string" ? column.columnDef.header : id
                    return (
                      <DropdownMenuCheckboxItem
                        key={id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(v) => column.toggleVisibility(!!v)}
                      >
                        {String(title)}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {toolbar}
          </div>
        </div>
      ) : null}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder ? null : (
                      header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 px-2"
                          onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                        >
                          <span className="mr-2">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnsWithSelection.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
