import * as React from 'react'
import type { ColumnDef, SortingState, ColumnFiltersState, VisibilityState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'
import { Button } from './button'
import { Input } from './input'
import { Skeleton } from './skeleton'
import { EmptyState, type EmptyStatePreset } from './empty-state'
import { cn } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  searchKey?: string
  pageSize?: number
  onRowClick?: (row: TData) => void
  emptyMessage?: string
  emptyPreset?: EmptyStatePreset
  emptyAction?: {
    label: string
    onClick: () => void
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search...',
  searchKey,
  pageSize = 10,
  onRowClick,
  emptyMessage = 'No results.',
  emptyPreset = 'general',
  emptyAction,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[300px] rounded-lg" />
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-3 w-20 rounded" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-[200px] rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchKey && (
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-64">
                  <EmptyState
                    preset={globalFilter ? 'search' : emptyPreset}
                    title={globalFilter ? `No results for "${globalFilter}"` : undefined}
                    description={globalFilter ? 'Try adjusting your search criteria.' : emptyMessage}
                    action={!globalFilter && emptyAction ? emptyAction : undefined}
                    className="py-8"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </span>
          {' '}to{' '}
          <span className="font-medium text-foreground">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </span>
          {' '}of{' '}
          <span className="font-medium text-foreground">
            {table.getFilteredRowModel().rows.length}
          </span>
          {' '}results
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm font-medium">
              {table.getState().pagination.pageIndex + 1}
            </span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              {table.getPageCount()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Sortable header helper
export function SortableHeader({
  column,
  children,
}: {
  column: { getIsSorted: () => 'asc' | 'desc' | false; toggleSorting: (desc?: boolean) => void }
  children: React.ReactNode
}) {
  const isSorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted === 'asc')}
      className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider hover:bg-transparent hover:text-foreground"
    >
      {children}
      <ArrowUpDown className={cn('ml-2 h-3.5 w-3.5', isSorted && 'text-primary')} />
    </Button>
  )
}
