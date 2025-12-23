import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, User, X, PauseCircle, Play, Printer, CheckCircle } from 'lucide-react';
import { Customer, Transaction } from '../types';

const POS: React.FC = () => {
  const { products, cart, heldOrders, addToCart, removeFromCart, updateCartQuantity, checkout, holdOrder, resumeOrder, deleteHeldOrder, settings, customers, currentCustomer, setCustomerForOrder, getStock, clearCart, currentBranch, currentOrg } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modals
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [autoDeliver, setAutoDeliver] = useState(false);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';

  const filteredProducts = products.filter(p =>
    (selectedCategory === 'All' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddToCart = (product: any) => {
      addToCart(product);
      // Subtle visual feedback toast can be added here if not in context
  };

  const handleCheckout = async (method: 'CASH' | 'QR' | 'CARD') => {
    const txn = await checkout(method, { autoDeliver });
    if (txn) {
      setLastTransaction(txn);
      setShowCheckoutModal(false);
      setShowReceiptModal(true);
      setAutoDeliver(false);
    }
  };

  const handleHoldOrder = () => {
     if (cart.length === 0) return;
     const note = prompt("Optional: Add a note for this held order");
     holdOrder(note || undefined);
  };

  const ReceiptView = ({ transaction }: { transaction: Transaction }) => {
     const date = new Date(transaction.date);
     return (
        <div className="bg-white p-6 max-w-sm mx-auto text-sm text-gray-800 font-mono border border-gray-200 shadow-sm mb-4">
           <div className="text-center mb-4 border-b border-gray-300 pb-2">
              <h2 className="text-xl font-bold">{currentOrg?.name || 'Store'}</h2>
              <p>{currentBranch?.name}</p>
              {currentBranch?.address && <p>{currentBranch.address}</p>}
              {currentOrg?.taxId && <p className="text-xs text-gray-600">Tax ID: {currentOrg.taxId}</p>}
              <p className="text-xs text-gray-500 mt-1">{date.toLocaleString()}</p>
              <p className="text-xs text-gray-500">TXN: {transaction.id}</p>
              <p className="text-xs text-gray-500">Fulfillment: {transaction.fulfillmentStatus}</p>
           </div>
           
           <div className="mb-4">
              {transaction.items.map((item, idx) => (
                 <div key={idx} className="flex justify-between mb-1">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{currencySymbol}{(item.price * item.quantity).toLocaleString()}</span>
                 </div>
              ))}
           </div>
           
           <div className="border-t border-gray-300 pt-2 space-y-1">
              <div className="flex justify-between font-bold text-lg">
                 <span>TOTAL</span>
                 <span>{currencySymbol}{transaction.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                 <span>Payment</span>
                 <span>{transaction.paymentMethod}</span>
              </div>
           </div>

           <div className="mt-6 text-center text-xs text-gray-500">
              <p>Thank you for shopping with us!</p>
           </div>
        </div>
     );
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden relative animate-fade-in">
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header & Filter */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
             <input
               type="text"
               placeholder="Search products (Name or SKU)..."
               className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white transition-shadow"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setSelectedCategory(cat)}
                 className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                   selectedCategory === cat
                     ? 'bg-primary-600 text-white shadow-md transform scale-105'
                     : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                 }`}
               >
                 {cat}
               </button>
             ))}
           </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const currentStock = getStock(product.id);
              return (
              <button
                key={product.id}
                onClick={() => handleAddToCart(product)}
                disabled={currentStock <= 0}
                className="flex flex-col text-left bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary-500 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative"
              >
                <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
                   {product.image ? (
                     <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-3xl">
                       {product.name?.slice(0, 1).toUpperCase()}
                     </div>
                   )}
                   {currentStock <= 0 && (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm backdrop-blur-sm">
                       Out of Stock
                     </div>
                   )}
                   {/* Add Icon Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white rounded-full p-2 text-primary-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                            <Plus size={24} />
                        </div>
                    </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1">{product.name}</h3>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="font-bold text-primary-600 dark:text-primary-400">{currencySymbol}{product.price}</span>
                    <span className={`text-xs ${currentStock <= 5 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>{currentStock} left</span>
                  </div>
                </div>
              </button>
            )})}
            
            {filteredProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-12">
                    <p>No products found matching "{searchTerm}"</p>
                    <button onClick={() => {setSearchTerm(''); setSelectedCategory('All');}} className="mt-2 text-primary-600 hover:underline">Clear Filters</button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[60vh] lg:h-full transition-all">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center space-x-2">
                <ShoppingCart className="text-primary-600" />
                <h2 className="font-bold text-lg dark:text-white">Current Order</h2>
             </div>
             <div className="flex items-center space-x-2">
                {heldOrders.length > 0 && (
                   <button 
                      onClick={() => setShowHeldOrdersModal(true)}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold flex items-center hover:bg-orange-200 transition-colors animate-pulse"
                   >
                      <PauseCircle size={12} className="mr-1"/> {heldOrders.length} Held
                   </button>
                )}
                <span key={cart.length} className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-bold transition-transform">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items
                </span>
             </div>
          </div>
          
          {/* Customer Selector */}
          <div 
             onClick={() => setShowCustomerModal(true)}
             className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 group"
          >
             <div className="flex items-center space-x-3 text-sm">
                <div className="bg-white dark:bg-gray-600 p-1.5 rounded-full text-gray-500 dark:text-gray-300 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                   <User size={16} />
                </div>
                <div>
                   {currentCustomer ? (
                      <p className="font-bold text-gray-900 dark:text-white">{currentCustomer.name}</p>
                   ) : (
                      <p className="text-gray-500 dark:text-gray-400">Select Customer</p>
                   )}
                   {currentCustomer && <p className="text-xs text-gray-500">{currentCustomer.points} Points</p>}
                </div>
             </div>
             {currentCustomer ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); setCustomerForOrder(null); }}
                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                >
                  <X size={16} />
                </button>
             ) : (
                <Plus size={16} className="text-gray-400 group-hover:text-primary-600" />
             )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <ShoppingCart size={48} className="mb-4 opacity-20" />
               <p>Cart is empty</p>
               <p className="text-xs mt-1">Select products to start</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-slide-up">
                 <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-primary-600 text-sm font-semibold">{currencySymbol}{item.price}</p>
                 </div>
                 <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-l-lg active:bg-gray-200">
                      <Minus size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium dark:text-white select-none">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-lg active:bg-gray-200">
                      <Plus size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                 </div>
                 <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                   <Trash2 size={18} />
                 </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
           <div className="flex justify-between items-center mb-4">
             <span className="text-gray-600 dark:text-gray-400 font-medium">Total</span>
             <span className="text-3xl font-bold text-gray-900 dark:text-white">{currencySymbol}{cartTotal.toLocaleString()}</span>
           </div>
           
           <div className="grid grid-cols-4 gap-2">
               <button 
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="col-span-1 bg-red-100 hover:bg-red-200 text-red-600 py-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
                  title="Clear Cart"
               >
                   <Trash2 size={20}/>
               </button>
               <button 
                  onClick={handleHoldOrder}
                  disabled={cart.length === 0}
                  className="col-span-1 bg-orange-100 hover:bg-orange-200 text-orange-600 py-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
                  title="Hold Order"
               >
                   <PauseCircle size={20}/>
               </button>
               <button
                 onClick={() => setShowCheckoutModal(true)}
                 disabled={cart.length === 0}
                 className="col-span-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all active:scale-[0.98] flex items-center justify-center"
               >
                 Pay {currencySymbol}{cartTotal.toLocaleString()}
               </button>
           </div>
        </div>
      </div>
      
      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-pop">
              <div className="p-6 text-center border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Method</h2>
                <p className="text-gray-500 mt-1">Total Amount: <span className="text-primary-600 font-bold text-lg">{currencySymbol}{cartTotal.toLocaleString()}</span></p>
                {currentCustomer && <p className="text-xs text-green-500 mt-1">Earning {Math.floor(cartTotal/100)} points for {currentCustomer.name}</p>}
              </div>
              <div className="p-6 space-y-3">
                 <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                   <div className="text-left">
                     <p className="text-sm font-semibold text-gray-900 dark:text-white">Mark as delivered now</p>
                     <p className="text-xs text-gray-500 dark:text-gray-300">Default is PENDING (recommended for fulfillment workflow)</p>
                   </div>
                   <input
                     type="checkbox"
                     className="h-4 w-4 accent-primary-600"
                     checked={autoDeliver}
                     onChange={e => setAutoDeliver(e.target.checked)}
                   />
                 </label>
                 <button onClick={() => handleCheckout('CASH')} className="w-full flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 group transition-all">
                    <div className="bg-green-100 text-green-600 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
                      <Banknote size={24} />
                    </div>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">Cash</span>
                 </button>
                 <button onClick={() => handleCheckout('QR')} className="w-full flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 group transition-all">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
                      <QrCode size={24} />
                    </div>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">Thai QR Payment</span>
                 </button>
                 <button onClick={() => handleCheckout('CARD')} className="w-full flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-500 group transition-all">
                    <div className="bg-purple-100 text-purple-600 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
                      <CreditCard size={24} />
                    </div>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">Credit Card</span>
                 </button>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 text-center">
                <button onClick={() => setShowCheckoutModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white font-medium">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-pop">
               <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold dark:text-white">Select Customer</h3>
                  <button onClick={() => setShowCustomerModal(false)}><X size={20} className="text-gray-500" /></button>
               </div>
               <div className="p-4 overflow-y-auto flex-1 space-y-2">
                  {customers.map(c => (
                     <button 
                        key={c.id} 
                        onClick={() => { setCustomerForOrder(c); setShowCustomerModal(false); }}
                        className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 text-left"
                     >
                        <div>
                           <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                           <p className="text-xs text-gray-500">{c.phone}</p>
                        </div>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">{c.points} pts</span>
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* Held Orders Modal */}
      {showHeldOrdersModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-pop">
               <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold dark:text-white">Held Orders</h3>
                  <button onClick={() => setShowHeldOrdersModal(false)}><X size={20} className="text-gray-500" /></button>
               </div>
               <div className="p-4 overflow-y-auto flex-1 space-y-3">
                  {heldOrders.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No held orders found.</p>
                  ) : heldOrders.map(order => (
                     <div key={order.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <p className="font-bold text-gray-900 dark:text-white">
                                  {order.customer ? order.customer.name : 'Guest'}
                              </p>
                              <p className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleTimeString()}</p>
                           </div>
                           <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-bold">
                              {currencySymbol}{order.items.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}
                           </span>
                        </div>
                        {order.note && <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded mb-2">Note: {order.note}</p>}
                        <div className="flex gap-2 mt-3">
                           <button 
                              onClick={() => { resumeOrder(order.id); setShowHeldOrdersModal(false); }}
                              className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center hover:bg-primary-700"
                           >
                              <Play size={16} className="mr-1"/> Resume
                           </button>
                           <button 
                              onClick={() => deleteHeldOrder(order.id)}
                              className="w-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200"
                           >
                              <Trash2 size={16}/>
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] animate-pop">
                 <div
                   className={`p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${
                     lastTransaction.fulfillmentStatus === 'DELIVERED' ? 'bg-green-50' : 'bg-amber-50'
                   }`}
                 >
                     <div
                       className={`flex items-center font-bold ${
                         lastTransaction.fulfillmentStatus === 'DELIVERED' ? 'text-green-700' : 'text-amber-800'
                       }`}
                     >
                         {lastTransaction.fulfillmentStatus === 'DELIVERED' ? (
                           <CheckCircle size={20} className="mr-2" />
                         ) : (
                           <PauseCircle size={20} className="mr-2" />
                         )}
                         {lastTransaction.fulfillmentStatus === 'DELIVERED' ? 'Order Delivered' : 'Order Created (Pending)'}
                     </div>
                     <button onClick={() => setShowReceiptModal(false)}><X size={20} className="text-gray-400"/></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900/40">
                     <ReceiptView transaction={lastTransaction} />
                 </div>

                 <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => window.print()} 
                        className="flex items-center justify-center bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
                     >
                        <Printer size={18} className="mr-2"/> Print
                     </button>
                     <button 
                        onClick={() => setShowReceiptModal(false)} 
                        className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
                     >
                        New Order
                     </button>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
};

export default POS;
