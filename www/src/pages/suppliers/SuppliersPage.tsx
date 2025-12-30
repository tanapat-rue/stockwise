import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Pencil, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ServerDataTable, ServerSortableHeader, type PaginationState, type SortingParams } from '@/components/ui/server-data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/features/suppliers'
import type { Supplier, CreateSupplierRequest } from '@/features/suppliers'
import { formatCurrency } from '@/lib/utils'

export function SuppliersPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingParams>({})

  const { data: suppliersData, isLoading } = useSuppliers({
    search,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sortBy: sorting.sortBy,
    sortOrder: sorting.sortOrder,
  })
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const suppliers = suppliersData?.data || []
  const total = suppliersData?.total || 0
  const pageCount = Math.ceil(total / pagination.pageSize)

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'code',
      header: t('common.code'),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('code') || '-'}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('common.name')}
        </ServerSortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{row.getValue('name')}</p>
            {row.original.contactPerson && (
              <p className="text-sm text-muted-foreground">{row.original.contactPerson}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: t('common.phone'),
      cell: ({ row }) => row.getValue('phone') || '-',
    },
    {
      accessorKey: 'totalOrders',
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('pages.suppliers.pos')}
        </ServerSortableHeader>
      ),
    },
    {
      accessorKey: 'totalPurchased',
      header: ({ column }) => (
        <ServerSortableHeader column={column}>
          {t('pages.suppliers.totalPurchased')}
        </ServerSortableHeader>
      ),
      cell: ({ row }) => formatCurrency(row.getValue('totalPurchased')),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingSupplier(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingSupplier(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const handleCreate = (data: CreateSupplierRequest) => {
    createSupplier.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    })
  }

  const handleUpdate = (data: CreateSupplierRequest) => {
    if (!editingSupplier) return
    updateSupplier.mutate(
      { id: editingSupplier.id, data },
      { onSuccess: () => setEditingSupplier(null) }
    )
  }

  const handleDelete = () => {
    if (!deletingSupplier) return
    deleteSupplier.mutate(deletingSupplier.id, {
      onSuccess: () => setDeletingSupplier(null),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.suppliers.title')}</h1>
          <p className="text-muted-foreground">{t('pages.suppliers.description')}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('pages.suppliers.addSupplier')}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={t('pages.suppliers.searchSuppliers')}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPagination((prev) => ({ ...prev, pageIndex: 0 }))
        }}
        className="max-w-sm"
      />

      {/* Table */}
      <ServerDataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        pageCount={pageCount}
        totalItems={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        emptyPreset="suppliers"
        emptyMessage={t('pages.suppliers.emptyMessage')}
      />

      {/* Create/Edit Dialog */}
      <SupplierFormDialog
        open={isCreateOpen || !!editingSupplier}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingSupplier(null)
          }
        }}
        supplier={editingSupplier}
        onSubmit={editingSupplier ? handleUpdate : handleCreate}
        isLoading={createSupplier.isPending || updateSupplier.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pages.suppliers.deleteSupplier')}</DialogTitle>
            <DialogDescription>
              {t('pages.suppliers.deleteConfirm', { name: deletingSupplier?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSupplier(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteSupplier.isPending}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onSubmit: (data: CreateSupplierRequest) => void
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: supplier?.name || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    contactPerson: supplier?.contactPerson || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? t('pages.suppliers.editSupplier') : t('pages.suppliers.addSupplier')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('pages.suppliers.companyName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">{t('pages.suppliers.contactPerson')}</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t('common.address')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isLoading}>
              {supplier ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
