import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Eye, Package, XCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Combobox } from '@/components/ui/combobox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  usePurchaseOrders,
  useCancelPurchaseOrder,
  useDuplicatePurchaseOrder,
} from '@/features/purchase-orders'
import type { PurchaseOrder, POStatus, POPaymentStatus } from '@/features/purchase-orders'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReceiveDialog } from '@/components/purchase-orders/ReceiveDialog'

const statusColors: Record<POStatus, string> = {
  DRAFT: 'secondary',
  PENDING: 'warning',
  PARTIAL: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'destructive',
}

const paymentStatusColors: Record<POPaymentStatus, string> = {
  UNPAID: 'secondary',
  PARTIAL: 'warning',
  PAID: 'success',
}

export function PurchaseOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all')
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null)
  const [cancellingPO, setCancellingPO] = useState<PurchaseOrder | null>(null)

  const { data: poData, isLoading } = usePurchaseOrders({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const cancelPO = useCancelPurchaseOrder()
  const duplicatePO = useDuplicatePurchaseOrder()

  const purchaseOrders = poData?.data || []

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <SortableHeader column={column}>PO #</SortableHeader>,
      cell: ({ row }) => (
        <Link
          to={`/purchase-orders/${row.original.id}/edit`}
          className="font-medium text-primary hover:underline"
        >
          {row.getValue('orderNumber')}
        </Link>
      ),
    },
    {
      accessorKey: 'supplierName',
      header: ({ column }) => <SortableHeader column={column}>Supplier</SortableHeader>,
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => formatCurrency(row.getValue('totalAmount')),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as POStatus
        return (
          <Badge variant={statusColors[status] as 'default'}>
            {status.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as POPaymentStatus
        return (
          <Badge variant={paymentStatusColors[status] as 'default'}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'expectedDeliveryDate',
      header: 'Expected',
      cell: ({ row }) => {
        const date = row.getValue('expectedDeliveryDate') as string
        return date ? formatDate(date) : '-'
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
        const po = row.original
        // Backend only allows receiving from "OPEN" which maps to "DRAFT"
        const canReceive = po.status === 'DRAFT'
        const canCancel = po.status === 'DRAFT'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/purchase-orders/${po.id}/edit`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {canReceive && (
                <DropdownMenuItem onClick={() => setReceivingPO(po)}>
                  <Package className="mr-2 h-4 w-4" />
                  Receive Items
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => duplicatePO.mutate(po.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setCancellingPO(po)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
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
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage supplier orders</p>
        </div>
        <Button asChild>
          <Link to="/purchase-orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search POs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Combobox
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'RECEIVED', label: 'Received' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as POStatus | 'all')}
          placeholder="All Status"
          searchPlaceholder="Search status..."
          className="w-44"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={purchaseOrders}
        isLoading={isLoading}
        emptyPreset="purchase-orders"
        emptyMessage="Create purchase orders to replenish your inventory."
      />

      {/* Receive Dialog */}
      <ReceiveDialog
        purchaseOrder={receivingPO}
        open={!!receivingPO}
        onOpenChange={() => setReceivingPO(null)}
      />

      {/* Cancel PO Confirmation */}
      <ConfirmDialog
        open={!!cancellingPO}
        onOpenChange={() => setCancellingPO(null)}
        variant="danger"
        title="Cancel Purchase Order?"
        description={`Are you sure you want to cancel ${cancellingPO?.orderNumber}? This action cannot be undone.`}
        confirmText="Cancel PO"
        cancelText="Keep PO"
        onConfirm={async () => {
          if (cancellingPO) {
            await cancelPO.mutateAsync({ id: cancellingPO.id })
          }
        }}
        loading={cancelPO.isPending}
      />
    </div>
  )
}
