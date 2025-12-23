import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Minus, Equal } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdjustStock, adjustmentReasonLabels } from '@/features/inventory';
import type { StockLevel, AdjustmentReason } from '@/features/inventory';

const adjustmentSchema = z.object({
  type: z.enum(['ADD', 'REMOVE', 'SET']),
  quantity: z.number().min(0, 'Quantity must be positive'),
  reason: z.string().min(1, 'Please select a reason'),
  notes: z.string().optional(),
  unitCost: z.number().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockLevel: StockLevel | null;
  initialType?: 'ADD' | 'REMOVE' | 'SET';
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  stockLevel,
  initialType = 'ADD',
}: StockAdjustmentDialogProps) {
  const adjustStock = useAdjustStock();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: initialType,
      quantity: 0,
      reason: '',
      notes: '',
    },
  });

  const adjustmentType = form.watch('type');
  const quantity = form.watch('quantity');

  // Reset form when dialog opens/closes or stock changes
  useEffect(() => {
    if (open && stockLevel) {
      form.reset({
        type: initialType,
        quantity: 0,
        reason: '',
        notes: '',
      });
    }
  }, [open, stockLevel, initialType, form]);

  const calculateNewQuantity = () => {
    if (!stockLevel) return 0;
    switch (adjustmentType) {
      case 'ADD':
        return stockLevel.quantity + (quantity || 0);
      case 'REMOVE':
        return Math.max(0, stockLevel.quantity - (quantity || 0));
      case 'SET':
        return quantity || 0;
      default:
        return stockLevel.quantity;
    }
  };

  const handleSubmit = (values: AdjustmentFormValues) => {
    if (!stockLevel) return;

    adjustStock.mutate(
      {
        productId: stockLevel.productId,
        variantId: stockLevel.variantId,
        branchId: stockLevel.branchId,
        type: values.type,
        quantity: values.quantity,
        reason: values.reason as AdjustmentReason,
        notes: values.notes,
        unitCost: values.unitCost,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!stockLevel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {stockLevel.productName}
            {stockLevel.variantName && ` - ${stockLevel.variantName}`}
            <br />
            <span className="text-muted-foreground">
              Current: {stockLevel.quantity} {stockLevel.unit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Adjustment Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <Tabs value={field.value} onValueChange={field.onChange}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="ADD" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add
                      </TabsTrigger>
                      <TabsTrigger value="REMOVE" className="gap-2">
                        <Minus className="h-4 w-4" />
                        Remove
                      </TabsTrigger>
                      <TabsTrigger value="SET" className="gap-2">
                        <Equal className="h-4 w-4" />
                        Set
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {adjustmentType === 'SET' ? 'New Quantity' : 'Quantity'}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-muted-foreground">{stockLevel.unit}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New quantity preview */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New quantity will be:</span>
                <span className="text-lg font-semibold">
                  {calculateNewQuantity()} {stockLevel.unit}
                </span>
              </div>
            </div>

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(adjustmentReasonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unit Cost (for ADD type) */}
            {adjustmentType === 'ADD' && (
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      className="resize-none"
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
              <Button type="submit" disabled={adjustStock.isPending}>
                {adjustStock.isPending ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
