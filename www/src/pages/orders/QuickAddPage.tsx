import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuickAddOrder, paymentMethods, salesChannelLabels } from '@/features/orders';
import type { SalesChannel } from '@/features/orders';
import { useProducts } from '@/features/products';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

export function QuickAddPage() {
  const navigate = useNavigate();
  const quickAdd = useQuickAddOrder();
  const { data: productsData } = useProducts({ limit: 100, status: 'ACTIVE' });

  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<SalesChannel>('POS');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [amountReceived, setAmountReceived] = useState<number | ''>('');

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal - discountAmount;
  const change = typeof amountReceived === 'number' ? amountReceived - total : 0;

  // Filter products based on search
  const filteredProducts = productsData?.data?.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addToCart = (product: typeof productsData.data[0]) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
    setProductSearch('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handleSubmit = () => {
    if (cart.length === 0) return;

    quickAdd.mutate(
      {
        branchId: 'main', // Default branch
        channel,
        customerName: customerName || 'Walk-in Customer',
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        paymentMethod,
        paymentAmount: total,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
      },
      {
        onSuccess: () => {
          // Reset cart
          setCart([]);
          setCustomerName('');
          setDiscountAmount(0);
          setAmountReceived('');
        },
      }
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Quick Add</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={channel} onValueChange={(v) => setChannel(v as SalesChannel)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(salesChannelLabels) as SalesChannel[]).map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {salesChannelLabels[ch]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Products Panel */}
        <div className="flex w-1/2 flex-col border-r">
          {/* Search */}
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {(productSearch ? filteredProducts : productsData?.data)
                ?.slice(0, 30)
                .map((product) => (
                  <button
                    key={product.id}
                    className="flex flex-col rounded-lg border p-3 text-left hover:bg-accent"
                    onClick={() => addToCart(product)}
                  >
                    <div className="font-medium line-clamp-2">{product.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{product.sku}</div>
                    <div className="mt-2 font-semibold">{formatCurrency(product.price)}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Cart Panel */}
        <div className="flex w-1/2 flex-col">
          {/* Customer */}
          <div className="border-b p-4">
            <Input
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <ShoppingCart className="mb-4 h-12 w-12" />
                <p>Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="w-24 text-right font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="border-t bg-muted/30 p-4">
            {/* Totals */}
            <div className="mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  min={0}
                  className="w-32 text-right"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              {[
                { value: 'CASH', icon: Banknote, label: 'Cash' },
                { value: 'CREDIT_CARD', icon: CreditCard, label: 'Card' },
                { value: 'PROMPTPAY', icon: QrCode, label: 'PromptPay' },
              ].map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  className="flex-col gap-1 h-auto py-3"
                  onClick={() => setPaymentMethod(method.value)}
                >
                  <method.icon className="h-5 w-5" />
                  <span className="text-xs">{method.label}</span>
                </Button>
              ))}
            </div>

            {/* Amount Received (for cash) */}
            {paymentMethod === 'CASH' && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Amount Received</span>
                  <Input
                    type="number"
                    min={0}
                    className="w-32 text-right"
                    value={amountReceived}
                    onChange={(e) =>
                      setAmountReceived(e.target.value ? parseFloat(e.target.value) : '')
                    }
                  />
                </div>
                {typeof amountReceived === 'number' && amountReceived >= total && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Change</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full h-12 text-lg"
              disabled={cart.length === 0 || quickAdd.isPending}
              onClick={handleSubmit}
            >
              {quickAdd.isPending ? 'Processing...' : `Complete Sale (${formatCurrency(total)})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
