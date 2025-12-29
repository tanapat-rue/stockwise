import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
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
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/features/customers'
import type { Customer, CreateCustomerRequest } from '@/features/customers'
import { formatCurrency } from '@/lib/utils'

export function CustomersPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  const { data: customersData, isLoading } = useCustomers({ search })
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  const customers = customersData?.data || []

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'code',
      header: t('common.code'),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('code') || '-'}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>{t('common.name')}</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{row.getValue('name')}</p>
            {row.original.email && (
              <p className="text-sm text-muted-foreground">{row.original.email}</p>
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
      header: ({ column }) => <SortableHeader column={column}>{t('pages.customers.orders')}</SortableHeader>,
    },
    {
      accessorKey: 'totalSpent',
      header: ({ column }) => <SortableHeader column={column}>{t('pages.customers.totalSpent')}</SortableHeader>,
      cell: ({ row }) => formatCurrency(row.getValue('totalSpent')),
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
            <DropdownMenuItem onClick={() => setEditingCustomer(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingCustomer(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const handleCreate = (data: CreateCustomerRequest) => {
    createCustomer.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    })
  }

  const handleUpdate = (data: CreateCustomerRequest) => {
    if (!editingCustomer) return
    updateCustomer.mutate(
      { id: editingCustomer.id, data },
      { onSuccess: () => setEditingCustomer(null) }
    )
  }

  const handleDelete = () => {
    if (!deletingCustomer) return
    deleteCustomer.mutate(deletingCustomer.id, {
      onSuccess: () => setDeletingCustomer(null),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.customers.title')}</h1>
          <p className="text-muted-foreground">{t('pages.customers.description')}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('pages.customers.addCustomer')}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={t('pages.customers.searchCustomers')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyPreset="customers"
        emptyMessage={t('pages.customers.emptyMessage')}
      />

      {/* Create/Edit Dialog */}
      <CustomerFormDialog
        open={isCreateOpen || !!editingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingCustomer(null)
          }
        }}
        customer={editingCustomer}
        onSubmit={editingCustomer ? handleUpdate : handleCreate}
        isLoading={createCustomer.isPending || updateCustomer.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pages.customers.deleteCustomer')}</DialogTitle>
            <DialogDescription>
              {t('pages.customers.deleteConfirm', { name: deletingCustomer?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCustomer(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteCustomer.isPending}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onSubmit: (data: CreateCustomerRequest) => void
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{customer ? t('pages.customers.editCustomer') : t('pages.customers.addCustomer')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
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
              {customer ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
