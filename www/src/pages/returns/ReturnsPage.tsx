import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Combobox } from '@/components/ui/combobox'
import { ReturnFormDialog } from '@/components/returns'
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
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ReturnType | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

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
      header: ({ column }) => <SortableHeader column={column}>{t('pages.returns.refNumber')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue('refNo')}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: t('pages.returns.type'),
      cell: ({ row }) => {
        const type = row.getValue('type') as ReturnType
        return (
          <Badge variant={type === 'CUSTOMER' ? 'default' : 'secondary'}>
            {t(`status.${type.toLowerCase()}`)}
          </Badge>
        )
      },
    },
    {
      id: 'reference',
      header: t('pages.returns.reference'),
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
      header: t('pages.purchaseOrders.items'),
      cell: ({ row }) => row.original.items.length,
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: ({ row }) => {
        const status = row.getValue('status') as ReturnStatus
        return (
          <Badge variant={statusColors[status] as 'default'}>
            {t(`status.${status.toLowerCase()}`)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>{t('pages.purchaseOrders.created')}</SortableHeader>,
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
                {t('common.viewDetails')}
              </DropdownMenuItem>
              {ret.status === 'REQUESTED' && (
                <>
                  <DropdownMenuItem onClick={() => approveReturn.mutate(ret.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('pages.returns.approve')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => rejectReturn.mutate({ id: ret.id })}>
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('pages.returns.reject')}
                  </DropdownMenuItem>
                </>
              )}
              {ret.status === 'APPROVED' && ret.type === 'CUSTOMER' && (
                <DropdownMenuItem onClick={() => receiveReturn.mutate(ret.id)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('pages.returns.receiveItems')}
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
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.returns.title')}</h1>
          <p className="text-muted-foreground">{t('pages.returns.description')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('pages.returns.newReturn')}
        </Button>
      </div>

      <ReturnFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('pages.returns.searchReturns')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Combobox
          options={[
            { value: 'all', label: t('status.allTypes') },
            { value: 'CUSTOMER', label: t('status.customer') },
            { value: 'SUPPLIER', label: t('status.supplier') },
          ]}
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as ReturnType | 'all')}
          placeholder={t('status.allTypes')}
          searchPlaceholder={t('pages.returns.searchType')}
          className="w-36"
        />
        <Combobox
          options={[
            { value: 'all', label: t('status.all') },
            { value: 'REQUESTED', label: t('status.requested') },
            { value: 'APPROVED', label: t('status.approved') },
            { value: 'REJECTED', label: t('status.rejected') },
            { value: 'RECEIVED', label: t('status.received') },
            { value: 'COMPLETED', label: t('status.completed') },
          ]}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ReturnStatus | 'all')}
          placeholder={t('status.all')}
          searchPlaceholder={t('pages.returns.searchStatus')}
          className="w-40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={returns}
        isLoading={isLoading}
        emptyMessage={t('pages.returns.emptyMessage')}
      />
    </div>
  )
}
