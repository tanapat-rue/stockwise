import { useState, useEffect } from 'react'
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
      header: ({ column }) => <SortableHeader column={column}>SKU</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('sku')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
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
      header: ({ column }) => <SortableHeader column={column}>Price</SortableHeader>,
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
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingProduct(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
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
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search products..."
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
        emptyMessage="Get started by adding your first product to the catalog."
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
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteProduct.isPending}
            >
              Delete
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
          <DialogTitle>{product ? 'Edit Product' : 'Create Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the product details below.' : 'Add a new product to your catalog.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="PROD-001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Product Name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Electronics, Clothing, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (Baht)</Label>
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
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {product ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
