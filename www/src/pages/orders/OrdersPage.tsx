import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      header: ({ column }) => <SortableHeader column={column}>{t('pages.orders.orderNumber')}</SortableHeader>,
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
      header: ({ column }) => <SortableHeader column={column}>{t('pages.orders.customer')}</SortableHeader>,
      cell: ({ row }) => row.getValue('customerName') || t('common.walkIn'),
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => <SortableHeader column={column}>{t('common.total')}</SortableHeader>,
      cell: ({ row }) => formatCurrency(row.getValue('totalAmount')),
    },
    {
      accessorKey: 'fulfillmentStatus',
      header: t('pages.orders.fulfillment'),
      cell: ({ row }) => {
        const status = row.getValue('fulfillmentStatus') as FulfillmentStatus
        return (
          <Badge variant={fulfillmentColors[status] as 'default'}>
            {t(`status.${status.toLowerCase()}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: t('pages.orders.payment'),
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as string
        const variant = status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'secondary'
        return <Badge variant={variant}>{t(`status.${status.toLowerCase()}`)}</Badge>
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>{t('common.date')}</SortableHeader>,
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
                  {t('common.viewDetails')}
                </Link>
              </DropdownMenuItem>
              {order.status === 'PENDING' && (
                <DropdownMenuItem onClick={() => confirmOrder.mutate(order.id)}>
                  {t('pages.orders.confirmOrder')}
                </DropdownMenuItem>
              )}
              {canShip && (
                <DropdownMenuItem onClick={() => setShippingOrder(order)}>
                  <Truck className="mr-2 h-4 w-4" />
                  {t('pages.orders.shipOrder')}
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
                    {t('pages.orders.cancelOrder')}
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
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.orders.title')}</h1>
          <p className="text-muted-foreground">{t('pages.orders.description')}</p>
        </div>
        <Button asChild>
          <Link to="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('pages.orders.newOrder')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('pages.orders.searchOrders')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Combobox
          options={[
            { value: 'all', label: t('status.all') },
            { value: 'PENDING', label: t('status.pending') },
            { value: 'CONFIRMED', label: t('status.confirmed') },
            { value: 'PROCESSING', label: t('status.processing') },
            { value: 'COMPLETED', label: t('status.completed') },
            { value: 'CANCELLED', label: t('status.cancelled') },
          ]}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          placeholder={t('status.all')}
          searchPlaceholder={t('pages.orders.searchStatus')}
          className="w-40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyPreset="orders"
        emptyMessage={t('pages.orders.emptyMessage')}
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
        title={t('pages.orders.cancelOrderConfirm')}
        description={t('pages.orders.cancelOrderDescription', { orderNumber: cancellingOrder?.orderNumber })}
        confirmText={t('pages.orders.cancelOrder')}
        cancelText={t('pages.orders.keepOrder')}
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
