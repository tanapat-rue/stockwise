import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Eye, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReturns, useApproveReturn, useRejectReturn, useReceiveReturn } from '@/features/returns'
import type { Return, ReturnStatus, ReturnType } from '@/features/returns'
import { formatDate } from '@/lib/utils'

const statusColors: Record<ReturnStatus, string> = {
  REQUESTED: 'warning',
  APPROVED: 'default',
  REJECTED: 'destructive',
  RECEIVED: 'success',
  SHIPPED: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'secondary',
}

export function ReturnsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ReturnType | 'all'>('all')

  const { data: returnsData, isLoading } = useReturns({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })
  const approveReturn = useApproveReturn()
  const rejectReturn = useRejectReturn()
  const receiveReturn = useReceiveReturn()

  const returns = returnsData?.data || []

  const columns: ColumnDef<Return>[] = [
    {
      accessorKey: 'refNo',
      header: ({ column }) => <SortableHeader column={column}>Ref #</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue('refNo')}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as ReturnType
        return (
          <Badge variant={type === 'CUSTOMER' ? 'default' : 'secondary'}>
            {type}
          </Badge>
        )
      },
    },
    {
      id: 'reference',
      header: 'Reference',
      cell: ({ row }) => {
        const ret = row.original
        if (ret.type === 'CUSTOMER') {
          return ret.orderNumber || ret.customerName || '-'
        }
        return ret.poNumber || ret.supplierName || '-'
      },
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => row.original.items.length,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as ReturnStatus
        return (
          <Badge variant={statusColors[status] as 'default'}>
            {status.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
      cell: ({ row }) => formatDate(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const ret = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {ret.status === 'REQUESTED' && (
                <>
                  <DropdownMenuItem onClick={() => approveReturn.mutate(ret.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => rejectReturn.mutate({ id: ret.id })}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {ret.status === 'APPROVED' && ret.type === 'CUSTOMER' && (
                <DropdownMenuItem onClick={() => receiveReturn.mutate(ret.id)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Receive Items
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
          <p className="text-muted-foreground">Manage customer and supplier returns</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Return
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search returns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as ReturnType | 'all')}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
            <SelectItem value="SUPPLIER">Supplier</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ReturnStatus | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="REQUESTED">Requested</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={returns}
        isLoading={isLoading}
        emptyMessage="No returns found."
      />
    </div>
  )
}
