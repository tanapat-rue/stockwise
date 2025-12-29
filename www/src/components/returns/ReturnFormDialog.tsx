import { useState } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useOrders, useOrder } from '@/features/orders'
import type { OrderItem } from '@/features/orders'
import { usePurchaseOrders, usePurchaseOrder } from '@/features/purchase-orders'
import type { POItem } from '@/features/purchase-orders'
import { useCreateReturn } from '@/features/returns'
import type { ReturnType, ReturnReason, ItemCondition } from '@/features/returns'

interface ReturnFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReturnItemForm {
  productId: string
  productName: string
  sku: string
  maxQuantity: number
  quantity: number
  reason: ReturnReason
  condition: ItemCondition
  restockable: boolean
  notes: string
}

interface AvailableItem {
  productId: string
  productName: string
  sku: string
  maxQty: number
}

const typeOptions = [
  { value: 'CUSTOMER', label: 'Customer Return' },
  { value: 'SUPPLIER', label: 'Supplier Return' },
]

const reasonOptions = [
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'WRONG_ITEM', label: 'Wrong Item' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'QUALITY', label: 'Quality Issue' },
  { value: 'OTHER', label: 'Other' },
]

const conditionOptions = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'USED', label: 'Used' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'UNSELLABLE', label: 'Unsellable' },
]

const restockableOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export function ReturnFormDialog({ open, onOpenChange }: ReturnFormDialogProps) {
  const [returnType, setReturnType] = useState<ReturnType>('CUSTOMER')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedPoId, setSelectedPoId] = useState('')
  const [items, setItems] = useState<ReturnItemForm[]>([])
  const [notes, setNotes] = useState('')

  const createReturn = useCreateReturn()

  // Fetch orders (for customer returns) - completed orders
  const { data: ordersData, isLoading: loadingOrders } = useOrders({ status: 'COMPLETED' })
  const orders = ordersData?.data || []

  // Fetch purchase orders (for supplier returns) - only received ones
  const { data: posData, isLoading: loadingPos } = usePurchaseOrders({ status: 'RECEIVED' })
  const purchaseOrders = posData?.data || []

  // Fetch selected order details
  const { data: orderDetail } = useOrder(returnType === 'CUSTOMER' ? selectedOrderId : '')
  const { data: poDetail } = usePurchaseOrder(returnType === 'SUPPLIER' ? selectedPoId : '')

  const handleTypeChange = (type: string) => {
    setReturnType(type as ReturnType)
    setSelectedOrderId('')
    setSelectedPoId('')
    setItems([])
  }

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId)
    setItems([])
  }

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId)
    setItems([])
  }

  const addItem = (productId: string, productName: string, sku: string, maxQty: number) => {
    if (items.find(i => i.productId === productId)) return
    setItems([
      ...items,
      {
        productId,
        productName,
        sku,
        maxQuantity: maxQty,
        quantity: 1,
        reason: 'DEFECTIVE',
        condition: 'USED',
        restockable: true,
        notes: '',
      },
    ])
  }

  const updateItem = (index: number, updates: Partial<ReturnItemForm>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)))
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (items.length === 0) return

    createReturn.mutate(
      {
        type: returnType,
        orderId: returnType === 'CUSTOMER' ? selectedOrderId : undefined,
        poId: returnType === 'SUPPLIER' ? selectedPoId : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          reason: item.reason,
          condition: item.condition,
          restockable: item.restockable,
          notes: item.notes || undefined,
        })),
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          resetForm()
        },
      }
    )
  }

  const resetForm = () => {
    setReturnType('CUSTOMER')
    setSelectedOrderId('')
    setSelectedPoId('')
    setItems([])
    setNotes('')
  }

  // Map order or PO items to available items
  const availableItems: AvailableItem[] =
    returnType === 'CUSTOMER'
      ? (orderDetail?.data?.items || []).map((i: OrderItem) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.productSku,
          maxQty: i.quantity,
        }))
      : (poDetail?.data?.items || []).map((i: POItem) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.productSku,
          maxQty: i.qtyReceived || i.qtyOrdered,
        }))

  const unusedItems = availableItems.filter(
    (ai) => !items.find((i) => i.productId === ai.productId)
  )

  // Build options for comboboxes
  const orderOptions = orders.map((order) => ({
    value: order.id,
    label: `${order.orderNumber} - ${order.customerName || 'Walk-in'}`,
    description: order.customerPhone || undefined,
  }))

  const poOptions = purchaseOrders.map((po) => ({
    value: po.id,
    label: `${po.orderNumber} - ${po.supplierName}`,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Return Request</DialogTitle>
          <DialogDescription>
            Request a return for items from an order or purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Return Type */}
          <div className="space-y-2">
            <Label>Return Type</Label>
            <Combobox
              options={typeOptions}
              value={returnType}
              onValueChange={handleTypeChange}
              placeholder="Select return type"
              searchPlaceholder="Search type..."
            />
          </div>

          {/* Order/PO Selection */}
          <div className="space-y-2">
            <Label>{returnType === 'CUSTOMER' ? 'Order' : 'Purchase Order'}</Label>
            {returnType === 'CUSTOMER' ? (
              orders.length === 0 && !loadingOrders ? (
                <p className="text-sm text-muted-foreground">
                  No orders available for return (orders must be completed)
                </p>
              ) : (
                <Combobox
                  options={orderOptions}
                  value={selectedOrderId}
                  onValueChange={handleOrderChange}
                  placeholder="Select an order"
                  searchPlaceholder="Search orders..."
                  emptyText="No orders found"
                  loading={loadingOrders}
                  clearable
                />
              )
            ) : purchaseOrders.length === 0 && !loadingPos ? (
              <p className="text-sm text-muted-foreground">
                No purchase orders available for return (must be received)
              </p>
            ) : (
              <Combobox
                options={poOptions}
                value={selectedPoId}
                onValueChange={handlePoChange}
                placeholder="Select a purchase order"
                searchPlaceholder="Search purchase orders..."
                emptyText="No purchase orders found"
                loading={loadingPos}
                clearable
              />
            )}
          </div>

          {/* Available Items */}
          {(selectedOrderId || selectedPoId) && unusedItems.length > 0 && (
            <div className="space-y-2">
              <Label>Add Items to Return</Label>
              <div className="grid gap-2">
                {unusedItems.map((item) => (
                  <Card key={item.productId}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.sku} | Max Qty: {item.maxQty}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addItem(item.productId, item.productName, item.sku, item.maxQty)
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Selected Items */}
          {items.length > 0 && (
            <div className="space-y-3">
              <Label>Items to Return</Label>
              {items.map((item, index) => (
                <Card key={item.productId}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity (max: {item.maxQuantity})</Label>
                        <Input
                          type="number"
                          min={1}
                          max={item.maxQuantity}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, {
                              quantity: Math.min(
                                Math.max(1, parseInt(e.target.value) || 1),
                                item.maxQuantity
                              ),
                            })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Reason</Label>
                        <Combobox
                          options={reasonOptions}
                          value={item.reason}
                          onValueChange={(v) => updateItem(index, { reason: v as ReturnReason })}
                          placeholder="Select reason"
                          searchPlaceholder="Search reason..."
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Condition</Label>
                        <Combobox
                          options={conditionOptions}
                          value={item.condition}
                          onValueChange={(v) => updateItem(index, { condition: v as ItemCondition })}
                          placeholder="Select condition"
                          searchPlaceholder="Search condition..."
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Restockable</Label>
                        <Combobox
                          options={restockableOptions}
                          value={item.restockable ? 'yes' : 'no'}
                          onValueChange={(v) => updateItem(index, { restockable: v === 'yes' })}
                          placeholder="Select"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes (optional)</Label>
                      <Input
                        placeholder="Additional notes for this item..."
                        value={item.notes}
                        onChange={(e) => updateItem(index, { notes: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* General Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="General notes for this return request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={items.length === 0 || createReturn.isPending}
          >
            {createReturn.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Return Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
