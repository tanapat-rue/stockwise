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
  User,
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
  useOrder,
  useCreateOrder,
  useUpdateOrder,
  useNextOrderNumber,
  salesChannelLabels,
} from '@/features/orders';
import type { SalesChannel } from '@/features/orders';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/ui-store';

const itemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().optional(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Price must be positive'),
  discount: z.number().min(0).optional(),
});

const orderSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  channel: z.string().min(1, 'Channel is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  discountAmount: z.number().optional(),
  taxRate: z.number().min(0).max(100),
  shippingCost: z.number().optional(),
  recipient: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  customerNote: z.string().optional(),
  internalNote: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export function OrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  // Data fetching
  const { data: order, isLoading: orderLoading } = useOrder(id || '');
  const { data: nextNumber } = useNextOrderNumber();
  const { data: customersData } = useCustomers();
  const { data: productsData } = useProducts({ limit: 100 });
  const { branches } = useAuthStore();

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();

  // Product search
  const [productSearch, setProductSearch] = useState('');

  // Form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      branchId: '',
      channel: 'WEB',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      customerId: '',
      customerName: 'Walk-in Customer',
      customerPhone: '',
      customerEmail: '',
      items: [],
      discountAmount: 0,
      taxRate: 7,
      shippingCost: 0,
      recipient: {
        name: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        postalCode: '',
      },
      customerNote: '',
      internalNote: '',
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
    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0);
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
    if (order && isEditing) {
      form.reset({
        branchId: order.branchId,
        channel: order.channel,
        orderDate: format(new Date(order.orderDate), 'yyyy-MM-dd'),
        customerId: order.customerId || '',
        customerName: order.customerName,
        customerPhone: order.customerPhone || '',
        customerEmail: order.customerEmail || '',
        items: order.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          productSku: item.productSku,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: (item.unitPrice || 0) / 100,  // Convert satang to THB for display
          discount: (item.discount || 0) / 100,  // Convert satang to THB for display
        })),
        discountAmount: (order.discountAmount || 0) / 100,  // Convert satang to THB
        taxRate: order.taxRate || 7,
        shippingCost: (order.shippingCost || 0) / 100,  // Convert satang to THB
        recipient: order.recipient || {
          name: '',
          phone: '',
          address: '',
          city: '',
          province: '',
          postalCode: '',
        },
        customerNote: order.customerNote || '',
        internalNote: order.internalNote || '',
      });
    }
  }, [order, isEditing, form]);

  const handleAddProduct = (product: NonNullable<typeof productsData>['data'][0]) => {
    addItem({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unit: 'pcs',
      quantity: 1,
      unitPrice: (product.price || 0) / 100,  // Convert satang to THB for display
      discount: 0,
    });
    setProductSearch('');
  };

  const handleCustomerSelect = (customerId: string) => {
    if (!customerId) {
      // Walk-in customer selected
      form.setValue('customerId', '');
      form.setValue('customerName', 'Walk-in Customer');
      form.setValue('customerPhone', '');
      form.setValue('customerEmail', '');
      return;
    }
    const customer = customersData?.find(c => c.id === customerId);
    if (customer) {
      form.setValue('customerId', customer.id);
      form.setValue('customerName', customer.name);
      form.setValue('customerPhone', customer.phone || '');
      form.setValue('customerEmail', customer.email || '');
      if (customer.address) {
        form.setValue('recipient.address', customer.address);
      }
    }
  };

  const handleSubmit = (values: OrderFormValues, asDraft: boolean = false) => {
    // Convert THB back to satang for storage
    const payload = {
      ...values,
      items: values.items.map(item => ({
        ...item,
        unitPrice: Math.round((item.unitPrice || 0) * 100),  // Convert THB to satang
        discount: Math.round((item.discount || 0) * 100),  // Convert THB to satang
      })),
      discountAmount: Math.round((values.discountAmount || 0) * 100),  // Convert THB to satang
      shippingCost: Math.round((values.shippingCost || 0) * 100),  // Convert THB to satang
      saveAsDraft: asDraft,
    };

    if (isEditing && id) {
      updateOrder.mutate(
        { id, data: payload },
        {
          onSuccess: () => navigate('/orders'),
        }
      );
    } else {
      createOrder.mutate(payload, {
        onSuccess: () => navigate('/orders'),
      });
    }
  };

  // Filter products based on search
  const filteredProducts = productsData?.data?.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (isEditing && orderLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title={isEditing ? `Edit ${order?.orderNumber || 'Order'}` : 'New Order'}
        description={isEditing ? 'Update order details' : `Order #: ${nextNumber || 'Generating...'}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => handleSubmit(v, false))} className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Basic order information</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Channel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(salesChannelLabels) as SalesChannel[]).map((ch) => (
                          <SelectItem key={ch} value={ch}>
                            {salesChannelLabels[ch]}
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
                    <FormLabel>Order Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
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
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Customer (Optional)</FormLabel>
                      <Select onValueChange={(v) => handleCustomerSelect(v === "__walkin__" ? "" : v)} value={field.value || "__walkin__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Walk-in Customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__walkin__">Walk-in Customer</SelectItem>
                          {customersData?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="recipient.address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recipient.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recipient.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
              <CardDescription>Add products to this order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
                {productSearch && filteredProducts && filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer"
                        onClick={() => handleAddProduct(product)}
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(product.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Table */}
              {itemFields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[100px]">Qty</TableHead>
                      <TableHead className="w-[150px]">Unit Price</TableHead>
                      <TableHead className="w-[100px]">Discount</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemFields.map((field, index) => {
                      const qty = watchedItems[index]?.quantity || 0;
                      const price = watchedItems[index]?.unitPrice || 0;
                      const discount = watchedItems[index]?.discount || 0;
                      const lineTotal = qty * price - discount;

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{field.productName}</div>
                              <div className="text-sm text-muted-foreground">{field.productSku}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
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
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4" />
                  <p>No items added yet</p>
                  <p className="text-sm">Search and add products above</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Discounts & Tax */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatTHB(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-{formatTHB(watchedDiscount)}</span>
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
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes from customer..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internalNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Internal notes (not visible to customer)..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/orders')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit((v) => handleSubmit(v, true))}
              disabled={createOrder.isPending || updateOrder.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              type="submit"
              disabled={createOrder.isPending || updateOrder.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Order' : 'Create Order'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
