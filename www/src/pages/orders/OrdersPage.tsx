import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Eye, Truck, XCircle } from 'lucide-react'
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
import { useOrders, useConfirmOrder, useCancelOrder } from '@/features/orders'
import type { Order, OrderStatus, FulfillmentStatus } from '@/features/orders'
import { formatCurrency, formatDate } from '@/lib/utils'
import { QuickShipDialog } from '@/components/orders/QuickShipDialog'

const fulfillmentColors: Record<FulfillmentStatus, string> = {
  PENDING: 'warning',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
}

export function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)

  const { data: ordersData, isLoading } = useOrders({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const confirmOrder = useConfirmOrder()
  const cancelOrder = useCancelOrder()

  const orders = ordersData?.data || []

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <SortableHeader column={column}>Order #</SortableHeader>,
      cell: ({ row }) => (
        <Link
          to={`/orders/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.getValue('orderNumber')}
        </Link>
      ),
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => <SortableHeader column={column}>Customer</SortableHeader>,
      cell: ({ row }) => row.getValue('customerName') || 'Walk-in',
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => formatCurrency(row.getValue('totalAmount')),
    },
    {
      accessorKey: 'fulfillmentStatus',
      header: 'Fulfillment',
      cell: ({ row }) => {
        const status = row.getValue('fulfillmentStatus') as FulfillmentStatus
        return (
          <Badge variant={fulfillmentColors[status] as 'default'}>
            {status.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as string
        const variant = status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'secondary'
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
      cell: ({ row }) => formatDate(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original
        const canShip = order.fulfillmentStatus === 'PENDING' || order.fulfillmentStatus === 'PROCESSING'
        const canCancel = order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.status !== 'REFUNDED'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/orders/${order.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {order.status === 'PENDING' && (
                <DropdownMenuItem onClick={() => confirmOrder.mutate(order.id)}>
                  Confirm Order
                </DropdownMenuItem>
              )}
              {canShip && (
                <DropdownMenuItem onClick={() => setShippingOrder(order)}>
                  <Truck className="mr-2 h-4 w-4" />
                  Ship Order
                </DropdownMenuItem>
              )}
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setCancellingOrder(order)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Order
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
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage customer orders</p>
        </div>
        <Button asChild>
          <Link to="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Combobox
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'PROCESSING', label: 'Processing' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          placeholder="All Status"
          searchPlaceholder="Search status..."
          className="w-40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyPreset="orders"
        emptyMessage="When customers place orders, they will appear here."
      />

      {/* Quick Ship Dialog */}
      <QuickShipDialog
        order={shippingOrder}
        open={!!shippingOrder}
        onOpenChange={() => setShippingOrder(null)}
      />

      {/* Cancel Order Confirmation */}
      <ConfirmDialog
        open={!!cancellingOrder}
        onOpenChange={() => setCancellingOrder(null)}
        variant="warning"
        title="Cancel Order?"
        description={`Are you sure you want to cancel order ${cancellingOrder?.orderNumber}? This will release any reserved inventory.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onConfirm={async () => {
          if (cancellingOrder) {
            await cancelOrder.mutateAsync({ id: cancellingOrder.id, data: {} })
          }
        }}
        loading={cancelOrder.isPending}
      />
    </div>
  )
}
