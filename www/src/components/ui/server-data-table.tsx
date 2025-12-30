import * as React from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'
import { Button } from './button'
import { Skeleton } from './skeleton'
import { EmptyState, type EmptyStatePreset } from './empty-state'
import { cn } from '@/lib/utils'

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface SortingParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ServerDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  pageCount: number
  totalItems: number
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  sorting?: SortingParams
  onSortingChange?: (sorting: SortingParams) => void
  onRowClick?: (row: TData) => void
  emptyMessage?: string
  emptyPreset?: EmptyStatePreset
  emptyAction?: {
    label: string
    onClick: () => void
  }
}

export function ServerDataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pageCount,
  totalItems,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  onRowClick,
  emptyMessage = 'No results.',
  emptyPreset = 'general',
  emptyAction,
}: ServerDataTableProps<TData, TValue>) {
  // Convert external sorting to internal format
  const internalSorting: SortingState = sorting?.sortBy
    ? [{ id: sorting.sortBy, desc: sorting.sortOrder === 'desc' }]
    : []

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: {
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
      sorting: internalSorting,
    },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function'
        ? updater({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize })
        : updater
      onPaginationChange(newPagination)
    },
    onSortingChange: (updater) => {
      if (!onSortingChange) return
      const newSorting = typeof updater === 'function'
        ? updater(internalSorting)
        : updater
      if (newSorting.length > 0) {
        onSortingChange({
          sortBy: newSorting[0].id,
          sortOrder: newSorting[0].desc ? 'desc' : 'asc',
        })
      } else {
        onSortingChange({})
      }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
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
              {Array.from({ length: pagination.pageSize }).map((_, i) => (
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

  const startItem = pagination.pageIndex * pagination.pageSize + 1
  const endItem = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalItems)

  return (
    <div className="space-y-4">
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
                    preset={emptyPreset}
                    description={emptyMessage}
                    action={emptyAction}
                    className="py-8"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">{startItem}</span>
            {' '}to{' '}
            <span className="font-medium text-foreground">{endItem}</span>
            {' '}of{' '}
            <span className="font-medium text-foreground">{totalItems}</span>
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
                {pagination.pageIndex + 1}
              </span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">
                {pageCount || 1}
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
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Sortable header helper for server-side sorting
export function ServerSortableHeader({
  column,
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  column?: { getIsSorted: () => 'asc' | 'desc' | false; toggleSorting: (desc?: boolean) => void }
  children: React.ReactNode
  sortKey?: string
  currentSort?: SortingParams
  onSort?: (params: SortingParams) => void
}) {
  // If using column-based sorting (from react-table)
  if (column) {
    const isSorted = column.getIsSorted()
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(isSorted === 'asc')}
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider hover:bg-transparent hover:text-foreground"
      >
        {children}
        {isSorted === 'asc' ? (
          <ArrowUp className="ml-2 h-3.5 w-3.5 text-primary" />
        ) : isSorted === 'desc' ? (
          <ArrowDown className="ml-2 h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        )}
      </Button>
    )
  }

  // Manual sorting (for server-side)
  if (sortKey && onSort) {
    const isActive = currentSort?.sortBy === sortKey
    const isDesc = currentSort?.sortOrder === 'desc'

    const handleClick = () => {
      if (!isActive) {
        onSort({ sortBy: sortKey, sortOrder: 'asc' })
      } else if (!isDesc) {
        onSort({ sortBy: sortKey, sortOrder: 'desc' })
      } else {
        onSort({})
      }
    }

    return (
      <Button
        variant="ghost"
        onClick={handleClick}
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider hover:bg-transparent hover:text-foreground"
      >
        {children}
        {isActive && !isDesc ? (
          <ArrowUp className="ml-2 h-3.5 w-3.5 text-primary" />
        ) : isActive && isDesc ? (
          <ArrowDown className="ml-2 h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        )}
      </Button>
    )
  }

  return <>{children}</>
}
