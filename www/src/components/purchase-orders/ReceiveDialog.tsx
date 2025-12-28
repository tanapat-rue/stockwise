import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReceivePurchaseOrder } from '@/features/purchase-orders'
import type { PurchaseOrder } from '@/features/purchase-orders'
import { formatCurrency } from '@/lib/utils'

interface ReceiveDialogProps {
  purchaseOrder: PurchaseOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReceiveDialog({ purchaseOrder, open, onOpenChange }: ReceiveDialogProps) {
  const receivePO = useReceivePurchaseOrder()

  const handleSubmit = () => {
    if (!purchaseOrder) return

    receivePO.mutate(
      {
        id: purchaseOrder.id,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    )
  }

  if (!purchaseOrder) return null

  const totalItems = purchaseOrder.items.reduce((sum, item) => sum + item.qtyOrdered, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receive Items
          </DialogTitle>
          <DialogDescription>
            Confirm receipt of all items for {purchaseOrder.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PO Number</span>
              <span className="font-medium">{purchaseOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Supplier</span>
              <span>{purchaseOrder.supplierName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">{formatCurrency(purchaseOrder.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Items</span>
              <span>{totalItems}</span>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Items to Receive</h4>
            <div className="max-h-48 overflow-auto space-y-1">
              {purchaseOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm p-2 rounded bg-muted/50"
                >
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-muted-foreground ml-2">({item.productSku})</span>
                  </div>
                  <span className="text-muted-foreground">
                    {item.qtyOrdered} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={receivePO.isPending}
          >
            <Package className="mr-2 h-4 w-4" />
            Receive All Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
