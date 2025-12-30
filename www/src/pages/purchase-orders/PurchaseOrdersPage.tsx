import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Eye, Package, XCircle, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ServerDataTable, ServerSortableHeader, type PaginationState, type SortingParams } from '@/components/ui/server-data-table'
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
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all')
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null)
  const [cancellingPO, setCancellingPO] = useState<PurchaseOrder | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingParams>({})

  const { data: poData, isLoading } = usePurchaseOrders({
    search,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
  })
  const cancelPO = useCancelPurchaseOrder()
  const duplicatePO = useDuplicatePurchaseOrder()

  const purchaseOrders = poData?.data || []
  const meta = poData?.meta || { page: 1, limit: 10, total: 0, totalPages: 0 }

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('pages.purchaseOrders.poNumber')}
        </ServerSortableHeader>
      ),
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
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('navigation.suppliers')}
        </ServerSortableHeader>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('common.total')}
        </ServerSortableHeader>
      ),
      cell: ({ row }) => formatCurrency(row.getValue('totalAmount')),
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as POStatus
        return (
          <Badge variant={statusColors[status] as 'default'}>
            {t(`status.${status.toLowerCase()}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: t('pages.orders.payment'),
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as POPaymentStatus
        return (
          <Badge variant={paymentStatusColors[status] as 'default'}>
            {t(`status.${status.toLowerCase()}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'expectedDeliveryDate',
      header: t('pages.purchaseOrders.expected'),
      cell: ({ row }) => {
        const date = row.getValue('expectedDeliveryDate') as string
        return date ? formatDate(date) : '-'
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('pages.purchaseOrders.created')}
        </ServerSortableHeader>
      ),
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
                  {t('common.viewDetails')}
                </Link>
              </DropdownMenuItem>
              {canReceive && (
                <DropdownMenuItem onClick={() => setReceivingPO(po)}>
                  <Package className="mr-2 h-4 w-4" />
                  {t('pages.purchaseOrders.receiveItems')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => duplicatePO.mutate(po.id)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('common.duplicate')}
              </DropdownMenuItem>
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setCancellingPO(po)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('pages.purchaseOrders.cancelPO')}
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
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.purchaseOrders.title')}</h1>
          <p className="text-muted-foreground">{t('pages.purchaseOrders.description')}</p>
        </div>
        <Button asChild>
          <Link to="/purchase-orders/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('pages.purchaseOrders.newPO')}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('pages.purchaseOrders.searchPOs')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          className="max-w-sm"
        />
        <Combobox
          options={[
            { value: 'all', label: t('status.all') },
            { value: 'DRAFT', label: t('status.draft') },
            { value: 'PENDING', label: t('status.pending') },
            { value: 'RECEIVED', label: t('status.received') },
            { value: 'CANCELLED', label: t('status.cancelled') },
          ]}
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as POStatus | 'all')
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          placeholder={t('status.all')}
          searchPlaceholder={t('pages.orders.searchStatus')}
          className="w-44"
        />
      </div>

      {/* Table */}
      <ServerDataTable
        columns={columns}
        data={purchaseOrders}
        isLoading={isLoading}
        pageCount={meta.totalPages}
        totalItems={meta.total}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        emptyPreset="purchase-orders"
        emptyMessage={t('pages.purchaseOrders.emptyMessage')}
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
        title={t('pages.purchaseOrders.cancelPOConfirm')}
        description={t('pages.purchaseOrders.cancelPODescription', { orderNumber: cancellingPO?.orderNumber })}
        confirmText={t('pages.purchaseOrders.cancelPO')}
        cancelText={t('pages.purchaseOrders.keepPO')}
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
