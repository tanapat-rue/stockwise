import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Pencil, Trash2, Package } from 'lucide-react'
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
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/features/products'
import type { Product, CreateProductRequest } from '@/features/products'
import { formatCurrency } from '@/lib/utils'

export function ProductsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const { data: productsData, isLoading } = useProducts({ search })
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const products = productsData?.data || []

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'sku',
      header: ({ column }) => <SortableHeader column={column}>{t('pages.products.sku')}</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('sku')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>{t('common.name')}</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{row.getValue('name')}</p>
            {row.original.category && (
              <p className="text-sm text-muted-foreground">{row.original.category}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <SortableHeader column={column}>{t('common.price')}</SortableHeader>,
      cell: ({ row }) => formatCurrency(row.getValue('price')),
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
            <DropdownMenuItem onClick={() => setEditingProduct(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingProduct(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const handleCreate = (data: CreateProductRequest) => {
    createProduct.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    })
  }

  const handleUpdate = (data: CreateProductRequest) => {
    if (!editingProduct) return
    updateProduct.mutate(
      { id: editingProduct.id, data },
      { onSuccess: () => setEditingProduct(null) }
    )
  }

  const handleDelete = () => {
    if (!deletingProduct) return
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.products.title')}</h1>
          <p className="text-muted-foreground">{t('pages.products.description')}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('pages.products.addProduct')}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('pages.products.searchProducts')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyPreset="products"
        emptyMessage={t('pages.products.emptyMessage')}
      />

      {/* Create/Edit Dialog */}
      <ProductFormDialog
        open={isCreateOpen || !!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingProduct(null)
          }
        }}
        product={editingProduct}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        isLoading={createProduct.isPending || updateProduct.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pages.products.deleteProduct')}</DialogTitle>
            <DialogDescription>
              {t('pages.products.deleteConfirm', { name: deletingProduct?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProduct(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteProduct.isPending}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Product Form Dialog Component
function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onSubmit: (data: CreateProductRequest) => void
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<CreateProductRequest>({
    sku: '',
    name: '',
    description: '',
    category: '',
    price: 0,
  })

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      if (product) {
        setFormData({
          sku: product.sku,
          name: product.name,
          description: product.description || '',
          category: product.category || '',
          price: product.price,
        })
      } else {
        setFormData({
          sku: '',
          name: '',
          description: '',
          category: '',
          price: 0,
        })
      }
    }
  }, [open, product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? t('pages.products.editProduct') : t('pages.products.createProduct')}</DialogTitle>
          <DialogDescription>
            {product ? t('pages.products.updateDescription') : t('pages.products.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sku">{t('pages.products.sku')}</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="PROD-001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('common.name')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t('pages.products.category')}</Label>
            <Input
              id="category"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder={t('pages.products.categoryPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">{t('pages.products.priceBaht')}</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price / 100}
              onChange={(e) =>
                setFormData({ ...formData, price: Math.round(parseFloat(e.target.value || '0') * 100) })
              }
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')}</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('pages.products.descriptionPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isLoading}>
              {product ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
