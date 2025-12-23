import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  Package,
  Calculator,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import {
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useSubmitPurchaseOrder,
  useNextPONumber,
} from '@/features/purchase-orders';
import { useSuppliers } from '@/features/suppliers';
import { useProducts } from '@/features/products';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/ui-store';

const itemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().optional(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  unit: z.string().optional(),
  qtyOrdered: z.number().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0, 'Cost must be positive'),
  discount: z.number().min(0).optional(),
});

const poSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  expectedDeliveryDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  discountAmount: z.number().optional(),
  taxRate: z.number().min(0).max(100),
  shippingCost: z.number().optional(),
  shippingChannel: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type POFormValues = z.infer<typeof poSchema>;

export function PurchaseOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  // Data fetching
  const { data: po, isLoading: poLoading } = usePurchaseOrder(id || '');
  const { data: nextNumber } = useNextPONumber();
  const { data: suppliersData } = useSuppliers();
  const { data: productsData } = useProducts({ limit: 100 });
  const { branches } = useAuthStore();

  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const submitPO = useSubmitPurchaseOrder();

  // Product search
  const [productSearch, setProductSearch] = useState('');

  // Form
  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      branchId: '',
      supplierId: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDeliveryDate: '',
      referenceNumber: '',
      items: [],
      discountAmount: 0,
      taxRate: 7,
      shippingCost: 0,
      shippingChannel: '',
      notes: '',
      internalNotes: '',
    },
  });

  const { fields: itemFields, append: addItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const watchedDiscount = form.watch('discountAmount') || 0;
  const watchedTaxRate = form.watch('taxRate') || 0;
  const watchedShipping = form.watch('shippingCost') || 0;

  // Calculate totals (all values are in THB in the form)
  // We calculate in THB and then convert to satang for formatCurrency
  const subtotal = watchedItems.reduce((sum, item) => {
    const lineTotal = (item.qtyOrdered || 0) * (item.unitCost || 0) - (item.discount || 0);
    return sum + lineTotal;
  }, 0);
  const afterDiscount = subtotal - watchedDiscount;
  const taxAmount = afterDiscount * (watchedTaxRate / 100);
  const totalAmount = afterDiscount + taxAmount + watchedShipping;

  // Helper to format THB values (multiply by 100 since formatCurrency expects satang)
  const formatTHB = (amount: number) => formatCurrency(Math.round(amount * 100));

  // Populate form when editing
  // NOTE: All monetary values are stored in satang (smallest currency unit)
  // We convert to THB for display (/100) and back to satang when saving (*100)
  useEffect(() => {
    if (po && isEditing) {
      form.reset({
        branchId: po.branchId,
        supplierId: po.supplierId,
        orderDate: format(new Date(po.orderDate), 'yyyy-MM-dd'),
        expectedDeliveryDate: po.expectedDeliveryDate
          ? format(new Date(po.expectedDeliveryDate), 'yyyy-MM-dd')
          : '',
        referenceNumber: po.referenceNumber || '',
        items: po.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          productSku: item.productSku,
          unit: item.unit,
          qtyOrdered: item.qtyOrdered,
          unitCost: (item.unitCost || 0) / 100,  // Convert satang to THB for display
          discount: (item.discount || 0) / 100,  // Convert satang to THB for display
        })),
        discountAmount: (po.discountAmount || 0) / 100,  // Convert satang to THB
        taxRate: po.taxRate,
        shippingCost: (po.shippingCost || 0) / 100,  // Convert satang to THB
        shippingChannel: po.shippingChannel || '',
        notes: po.notes || '',
        internalNotes: po.internalNotes || '',
      });
    }
  }, [po, isEditing, form]);

  const handleAddProduct = (product: typeof productsData.data[0]) => {
    addItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unit: product.unit,
      qtyOrdered: 1,
      unitCost: (product.cost || 0) / 100,  // Convert satang to THB for display
      discount: 0,
    });
    setProductSearch('');
  };

  const handleSubmit = (values: POFormValues, asDraft: boolean = true) => {
    // Convert THB back to satang for storage
    const payload = {
      ...values,
      items: values.items.map(item => ({
        ...item,
        unitCost: Math.round((item.unitCost || 0) * 100),  // Convert THB to satang
        discount: Math.round((item.discount || 0) * 100),  // Convert THB to satang
      })),
      discountAmount: Math.round((values.discountAmount || 0) * 100),  // Convert THB to satang
      shippingCost: Math.round((values.shippingCost || 0) * 100),  // Convert THB to satang
    };

    if (isEditing && id) {
      updatePO.mutate(
        { id, data: payload },
        {
          onSuccess: () => {
            if (!asDraft) {
              submitPO.mutate(id, {
                onSuccess: () => navigate('/purchase-orders'),
              });
            } else {
              navigate('/purchase-orders');
            }
          },
        }
      );
    } else {
      createPO.mutate(payload, {
        onSuccess: (response) => {
          if (!asDraft && response.data.data) {
            submitPO.mutate(response.data.data.id, {
              onSuccess: () => navigate('/purchase-orders'),
            });
          } else {
            navigate('/purchase-orders');
          }
        },
      });
    }
  };

  // Filter products based on search
  const filteredProducts = productsData?.data?.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (isEditing && poLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title={isEditing ? `Edit ${po?.orderNumber || 'Purchase Order'}` : 'New Purchase Order'}
        description={isEditing ? 'Update purchase order details' : `Order #: ${nextNumber || 'Generating...'}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => handleSubmit(v, true))} className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "__select__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__select__" disabled>Select supplier</SelectItem>
                          {suppliersData?.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiving Branch *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "__select__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__select__" disabled>Select branch</SelectItem>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Delivery</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Supplier invoice/ref" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingChannel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Channel</FormLabel>
                      <FormControl>
                        <Input placeholder="Carrier/method" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items
                </CardTitle>
                <CardDescription>Add products to this purchase order</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {/* Product Search */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products to add..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
                {productSearch && filteredProducts && filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                    <div className="max-h-60 overflow-auto p-1">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full rounded px-3 py-2 text-left hover:bg-accent"
                          onClick={() => handleAddProduct(product)}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.sku} • {formatCurrency(product.cost || 0)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              {itemFields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemFields.map((field, index) => {
                      const item = watchedItems[index];
                      const lineTotal = (item?.qtyOrdered || 0) * (item?.unitCost || 0) - (item?.discount || 0);
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item?.productName || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">
                                {item?.productSku} • {item?.unit}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.qtyOrdered`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={1}
                                  className="w-20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitCost`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="w-28"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="w-24"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatTHB(lineTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                  Search and add products above
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Order Totals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Discount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatTHB(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>-{formatTHB(watchedDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ({watchedTaxRate}%)</span>
                      <span>{formatTHB(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatTHB(watchedShipping)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatTHB(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes visible to supplier..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Internal notes (not sent to supplier)..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/purchase-orders')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={createPO.isPending || updatePO.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={form.handleSubmit((v) => handleSubmit(v, false))}
              disabled={createPO.isPending || updatePO.isPending || submitPO.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Save & Submit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
