import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Package, Plus, Minus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useStock, useAdjustStock } from '@/features/inventory'
import type { StockLevel } from '@/features/inventory'

export function StockPage() {
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [adjustingItem, setAdjustingItem] = useState<StockLevel | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add')
  const [adjustmentQty, setAdjustmentQty] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')

  const { data: stockData, isLoading } = useStock({ search, lowStock: showLowStock })
  const adjustStock = useAdjustStock()

  const stockLevels = stockData?.data || []

  const columns: ColumnDef<StockLevel>[] = [
    {
      accessorKey: 'productSku',
      header: ({ column }) => <SortableHeader column={column}>SKU</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('productSku')}</span>
      ),
    },
    {
      accessorKey: 'productName',
      header: ({ column }) => <SortableHeader column={column}>Product</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="font-medium">{row.getValue('productName')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <SortableHeader column={column}>On Hand</SortableHeader>,
      cell: ({ row }) => {
        const qty = row.getValue('quantity') as number
        const isLow = row.original.isLowStock
        return (
          <div className="flex items-center gap-2">
            <span className={isLow ? 'font-bold text-orange-600' : ''}>{qty}</span>
            {isLow && <AlertTriangle className="h-4 w-4 text-orange-500" />}
          </div>
        )
      },
    },
    {
      accessorKey: 'reserved',
      header: 'Reserved',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('reserved')}</span>
      ),
    },
    {
      accessorKey: 'availableQuantity',
      header: ({ column }) => <SortableHeader column={column}>Available</SortableHeader>,
      cell: ({ row }) => {
        const available = row.getValue('availableQuantity') as number
        return (
          <Badge variant={available > 0 ? 'success' : 'destructive'}>
            {available}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'minStock',
      header: 'Reorder Point',
      cell: ({ row }) => row.getValue('minStock'),
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
            <DropdownMenuItem
              onClick={() => {
                setAdjustingItem(row.original)
                setAdjustmentType('add')
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setAdjustingItem(row.original)
                setAdjustmentType('subtract')
              }}
            >
              <Minus className="mr-2 h-4 w-4" />
              Subtract Stock
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const handleAdjustStock = () => {
    if (!adjustingItem || !adjustmentQty || !adjustmentReason) return

    const qty = parseInt(adjustmentQty)
    if (isNaN(qty) || qty <= 0) return

    adjustStock.mutate(
      {
        productId: adjustingItem.productId,
        branchId: adjustingItem.branchId,
        quantity: adjustmentType === 'add' ? qty : -qty,
        reason: adjustmentReason,
      },
      {
        onSuccess: () => {
          setAdjustingItem(null)
          setAdjustmentQty('')
          setAdjustmentReason('')
        },
      }
    )
  }

  const lowStockCount = stockLevels.filter((s) => s.isLowStock).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground">Monitor and manage inventory</p>
        </div>
        {lowStockCount > 0 && (
          <Badge variant="warning" className="text-base px-3 py-1">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {lowStockCount} items low
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={showLowStock ? 'default' : 'outline'}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stock Only
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={stockLevels}
        isLoading={isLoading}
        emptyPreset="inventory"
        emptyMessage="Add products and stock to see inventory information."
      />

      {/* Adjustment Dialog */}
      <Dialog open={!!adjustingItem} onOpenChange={() => setAdjustingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Add Stock' : 'Subtract Stock'}
            </DialogTitle>
            <DialogDescription>
              {adjustmentType === 'add' ? 'Add' : 'Remove'} stock for{' '}
              <strong>{adjustingItem?.productName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">Current quantity:</div>
              <Badge variant="outline">{adjustingItem?.quantity}</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Physical count adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustingItem(null)}>
              Cancel
            </Button>
            <Button
              variant={adjustmentType === 'subtract' ? 'destructive' : 'default'}
              onClick={handleAdjustStock}
              loading={adjustStock.isPending}
              disabled={!adjustmentQty || !adjustmentReason}
            >
              {adjustmentType === 'add' ? 'Add' : 'Subtract'} Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
