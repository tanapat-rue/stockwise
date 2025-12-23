import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useReceiveItems } from '@/features/purchase-orders';
import type { PurchaseOrder, PurchaseOrderItem } from '@/features/purchase-orders';

const receiveSchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    qtyReceived: z.number().min(0),
    lotNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  })),
  notes: z.string().optional(),
});

type ReceiveFormValues = z.infer<typeof receiveSchema>;

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder | null;
}

export function ReceiveDialog({ open, onOpenChange, purchaseOrder }: ReceiveDialogProps) {
  const receiveItems = useReceiveItems();

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      items: purchaseOrder?.items.map((item) => ({
        itemId: item.id,
        qtyReceived: item.qtyPending,
        lotNumber: '',
        expiryDate: '',
      })) || [],
      notes: '',
    },
  });

  // Reset form when dialog opens with new PO
  useEffect(() => {
    if (open && purchaseOrder) {
      form.reset({
        items: purchaseOrder.items.map((item) => ({
          itemId: item.id,
          qtyReceived: item.qtyPending,
          lotNumber: '',
          expiryDate: '',
        })),
        notes: '',
      });
    }
  }, [open, purchaseOrder, form]);

  const handleSubmit = (values: ReceiveFormValues) => {
    if (!purchaseOrder) return;

    receiveItems.mutate(
      {
        id: purchaseOrder.id,
        payload: {
          items: values.items.filter((item) => item.qtyReceived > 0),
          notes: values.notes,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!purchaseOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receive Items
          </DialogTitle>
          <DialogDescription>
            Record received quantities for {purchaseOrder.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Already Received</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Receiving Now</TableHead>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">{item.productSku}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.qtyOrdered}</TableCell>
                      <TableCell className="text-right">
                        {item.qtyReceived > 0 ? (
                          <Badge variant="secondary">{item.qtyReceived}</Badge>
                        ) : (
                          '0'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.qtyPending}
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.qtyReceived`}
                          render={({ field }) => (
                            <Input
                              type="number"
                              min={0}
                              max={item.qtyPending}
                              className="w-20"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.lotNumber`}
                          render={({ field }) => (
                            <Input
                              placeholder="Lot #"
                              className="w-24"
                              {...field}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.expiryDate`}
                          render={({ field }) => (
                            <Input
                              type="date"
                              className="w-36"
                              {...field}
                            />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this receipt..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={receiveItems.isPending}>
                <Check className="mr-2 h-4 w-4" />
                {receiveItems.isPending ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
