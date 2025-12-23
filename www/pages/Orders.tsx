import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Transaction, FulfillmentStatus } from '../types';
import { Search, FileText, ArrowDown, ArrowUp, ArrowLeftRight, Calendar, ShoppingBag, Globe, Truck, Package, Check, X, Box, ScanLine, Printer, CheckCircle, Ban, RefreshCw, XCircle } from 'lucide-react';
import Combobox from '../components/Combobox';

const Orders: React.FC = () => {
  const { transactions, settings, updateFulfillmentStatus, bulkUpdateStatus, cancelOrder } = useApp();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modes
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  // Modals
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null);
  const [shippingForm, setShippingForm] = useState({ carrier: '', trackingNumber: '' });
  
  // Cancel Form
  const [cancelForm, setCancelForm] = useState({ reason: '', restock: true });

  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';

  // Only show Sales (Orders)
  const saleTransactions = transactions.filter(t => t.type === 'SALE').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = saleTransactions.filter(t => {
    let matchesTab = true;
    if (activeTab === 'ALL') matchesTab = true;
    else if (activeTab === 'CANCELLED') matchesTab = t.fulfillmentStatus === 'CANCELLED' || t.fulfillmentStatus === 'RETURNED';
    else matchesTab = t.fulfillmentStatus === activeTab;

    const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.shippingInfo?.trackingNumber.includes(searchTerm);
    
    return matchesTab && matchesSearch;
  });

  // Bulk Selection Logic
  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };
  
  const toggleSelectAll = () => {
      if (selectedIds.size === filteredTransactions.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
      }
  };

  const handleBulkAction = (status: FulfillmentStatus) => {
      if (confirm(`Mark ${selectedIds.size} orders as ${status}?`)) {
          bulkUpdateStatus(Array.from(selectedIds), status);
          setSelectedIds(new Set());
      }
  };

  // Scan Mode Logic
  useEffect(() => {
      if (scanMode && scanInputRef.current) {
          scanInputRef.current.focus();
      }
  }, [scanMode]);

  const handleScanSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const order = transactions.find(t => 
          (t.shippingInfo?.trackingNumber === scanInput) || 
          (t.id === scanInput) ||
          (t.referenceId === scanInput)
      );

      if (order) {
          if (order.fulfillmentStatus === 'DELIVERED') {
              alert(`Order ${order.id} is already completed.`);
          } else {
              updateFulfillmentStatus(order.id, 'DELIVERED'); // Scan to deliver/complete
              const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
              audio.play().catch(e => console.log('Audio play failed', e));
          }
          setScanInput('');
      } else {
          alert('Order not found!');
          setScanInput('');
      }
  };

  const getChannelBadge = (channel: string) => {
      switch(channel) {
          case 'SHOPEE': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold border border-orange-200">Shopee</span>;
          case 'LAZADA': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">Lazada</span>;
          case 'TIKTOK': return <span className="bg-black text-white px-2 py-0.5 rounded text-xs font-bold">TikTok</span>;
          default: return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold border border-gray-200">POS</span>;
      }
  };

  const getStatusColor = (status: FulfillmentStatus) => {
      switch(status) {
          case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'PICKED': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'PACKED': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'SHIPPED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
          case 'DELIVERED': return 'bg-green-100 text-green-700 border-green-200';
          case 'RETURNED': return 'bg-red-100 text-red-700 border-red-200';
          case 'CANCELLED': return 'bg-gray-100 text-gray-600 border-gray-200';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const openFulfillModal = (order: Transaction) => {
      setSelectedOrder(order);
      setShippingForm({ carrier: 'Kerry Express', trackingNumber: '' });
      setIsFulfillModalOpen(true);
  };
  
  const openCancelModal = (order: Transaction) => {
      setSelectedOrder(order);
      setCancelForm({ reason: '', restock: true });
      setIsCancelModalOpen(true);
  };

  const confirmShipping = () => {
      if (!selectedOrder) return;
      updateFulfillmentStatus(selectedOrder.id, 'SHIPPED', shippingForm);
      setIsFulfillModalOpen(false);
  };
  
  const confirmCancel = () => {
      if(!selectedOrder) return;
      cancelOrder(selectedOrder.id, cancelForm.reason, cancelForm.restock);
      setIsCancelModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Order Management</h1>
            <p className="text-sm text-gray-500">
               {scanMode ? "Scan tracking numbers to complete orders." : "Manage fulfillment workflow and cancellations."}
            </p>
         </div>
         <div className="flex gap-2">
             {!scanMode && selectedIds.size > 0 && (
                 <div className="flex gap-2 animate-fade-in">
                     <button onClick={() => handleBulkAction('PICKED')} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-blue-200">Mark Picked</button>
                     <button onClick={() => handleBulkAction('PACKED')} className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-purple-200">Mark Packed</button>
                     <button onClick={() => handleBulkAction('SHIPPED')} className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-indigo-200">Mark Shipped</button>
                 </div>
             )}
             <button 
                onClick={() => setScanMode(!scanMode)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all ${scanMode ? 'bg-red-500 text-white shadow-lg scale-105' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
             >
                <ScanLine size={18} />
                <span>{scanMode ? 'Exit Scan Mode' : 'Scan to Complete'}</span>
             </button>
         </div>
      </div>

      {/* Scan Mode Interface */}
      {scanMode && (
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8 rounded-2xl shadow-2xl flex flex-col items-center justify-center space-y-4 border-2 border-primary-500">
              <ScanLine size={48} className="text-primary-500 dark:text-primary-400 animate-pulse" />
              <h2 className="text-2xl font-mono font-bold">READY TO COMPLETE</h2>
              <p className="text-gray-500 dark:text-gray-400">Scan tracking number or Order ID to mark as DELIVERED</p>
              <form onSubmit={handleScanSubmit} className="w-full max-w-md">
                  <input 
                      ref={scanInputRef}
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-6 py-4 text-center text-xl font-mono focus:ring-4 focus:ring-primary-500 focus:outline-none"
                      placeholder="Waiting for input..."
                      autoFocus
                  />
              </form>
          </div>
      )}

      {!scanMode && (
        <>
            {/* Workflow Tabs */}
            <div className="flex space-x-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 pb-1">
                {['ALL', 'PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab 
                            ? 'border-primary-600 text-primary-600 dark:text-primary-400' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab === 'ALL' ? 'All Orders' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                        <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                            {tab === 'CANCELLED' 
                               ? saleTransactions.filter(t => t.fulfillmentStatus === 'CANCELLED' || t.fulfillmentStatus === 'RETURNED').length
                               : saleTransactions.filter(t => tab === 'ALL' ? true : t.fulfillmentStatus === tab).length
                            }
                        </span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                type="text"
                placeholder="Search Order ID, Tracking No, or Recipient..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="space-y-4">
                {/* Header for Bulk Select */}
                {filteredTransactions.length > 0 && (
                    <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={selectedIds.size === filteredTransactions.length}
                            onChange={toggleSelectAll}
                        />
                        <span className="ml-3 text-sm text-gray-500">Select All ({filteredTransactions.length})</span>
                    </div>
                )}

                {filteredTransactions.map(t => (
                    <div key={t.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all ${selectedIds.has(t.id) ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}>
                        <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
                            <div className="flex items-center h-full">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    checked={selectedIds.has(t.id)}
                                    onChange={() => toggleSelect(t.id)}
                                />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{t.id}</span>
                                    {getChannelBadge(t.channel)}
                                    {t.status === 'REFUNDED' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">REFUNDED</span>}
                                </div>
                                <div className="flex flex-wrap items-center text-xs text-gray-500 gap-4 mt-1">
                                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(t.date).toLocaleString()}</span>
                                    {t.referenceId && <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">Ref: {t.referenceId}</span>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(t.fulfillmentStatus)}`}>
                                    {t.fulfillmentStatus}
                                </span>
                                {t.shippingInfo && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">{t.shippingInfo.carrier}</p>
                                        <p className="text-sm font-mono font-bold text-primary-600 cursor-pointer hover:underline flex items-center justify-end">
                                            <Truck size={12} className="mr-1"/>
                                            {t.shippingInfo.trackingNumber}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Recipient Info */}
                            <div className="col-span-1 text-sm text-gray-600 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 pr-4">
                                <p className="font-bold text-gray-900 dark:text-white mb-1 flex items-center">
                                    <FileText size={14} className="mr-2 text-gray-400"/> Recipient
                                </p>
                                <p>{t.recipientName}</p>
                                {t.recipientPhone && <p className="text-xs">{t.recipientPhone}</p>}
                                {t.recipientAddress && <p className="text-xs mt-1 text-gray-500 line-clamp-2">{t.recipientAddress}</p>}
                                {t.cancellationReason && (
                                    <div className="mt-2 bg-red-50 text-red-600 p-2 rounded text-xs">
                                        <strong>Cancelled:</strong> {t.cancellationReason}
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            <div className="col-span-2 space-y-2">
                                {t.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-gray-100 dark:bg-gray-700 w-6 h-6 flex items-center justify-center rounded text-xs font-bold text-gray-600 dark:text-gray-300">
                                                {item.quantity}
                                            </span>
                                            <div>
                                                <p className="text-gray-900 dark:text-white font-medium">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.sku}</p>
                                            </div>
                                        </div>
                                        <span className="text-gray-600 dark:text-gray-400">{currencySymbol}{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        {/* Workflow Buttons */}
                                        {t.fulfillmentStatus === 'PENDING' && (
                                            <>
                                              <button onClick={() => updateFulfillmentStatus(t.id, 'PICKED')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">Mark Picked</button>
                                              <button onClick={() => openCancelModal(t)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Cancel</button>
                                            </>
                                        )}
                                        {t.fulfillmentStatus === 'PICKED' && (
                                            <button onClick={() => updateFulfillmentStatus(t.id, 'PACKED')} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100">Mark Packed</button>
                                        )}
                                        {t.fulfillmentStatus === 'PACKED' && (
                                            <button onClick={() => openFulfillModal(t)} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">Ship Order</button>
                                        )}
                                        {t.fulfillmentStatus === 'SHIPPED' && (
                                            <button onClick={() => updateFulfillmentStatus(t.id, 'DELIVERED')} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 flex items-center"><CheckCircle size={12} className="mr-1"/> Force Complete</button>
                                        )}
                                        {(t.fulfillmentStatus === 'SHIPPED' || t.fulfillmentStatus === 'DELIVERED') && (
                                             <button onClick={() => openCancelModal(t)} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Return / Refund</button>
                                        )}
                                    </div>
                                    <p className="font-bold text-gray-900 dark:text-white">Total: {currencySymbol}{t.total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredTransactions.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <Package size={48} className="mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-500">No orders found.</p>
                    </div>
                )}
            </div>
        </>
      )}

      {/* Shipping Modal */}
      {isFulfillModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-xl font-bold dark:text-white">Ship Order</h2>
                      <p className="text-sm text-gray-500">Order #{selectedOrder?.id}</p>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carrier</label>
                          <Combobox 
                             options={['Kerry Express', 'Flash Express', 'J&T Express', 'Thailand Post', 'DHL'].map(c => ({ value: c, label: c }))}
                             value={shippingForm.carrier}
                             onChange={(val) => setShippingForm({...shippingForm, carrier: val})}
                             placeholder="Select Carrier"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking Number</label>
                          <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                value={shippingForm.trackingNumber}
                                onChange={e => setShippingForm({...shippingForm, trackingNumber: e.target.value})}
                                placeholder="Scan or type tracking no."
                                autoFocus
                            />
                            <button className="p-2 bg-gray-100 rounded-lg"><ScanLine size={20}/></button>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                      <button onClick={() => setIsFulfillModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                      <button 
                         onClick={confirmShipping} 
                         disabled={!shippingForm.trackingNumber}
                         className="px-4 py-2 bg-primary-600 disabled:bg-gray-400 text-white rounded-lg flex items-center"
                      >
                         <Truck size={16} className="mr-2"/> Confirm Shipment
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 rounded-t-2xl">
                      <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
                          <Ban size={24} className="mr-2"/>
                          {['SHIPPED', 'DELIVERED'].includes(selectedOrder?.fulfillmentStatus || '') ? 'Return & Refund' : 'Cancel Order'}
                      </h2>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                          <textarea 
                             className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                             rows={3}
                             placeholder="e.g. Customer changed mind, Defective product..."
                             value={cancelForm.reason}
                             onChange={e => setCancelForm({...cancelForm, reason: e.target.value})}
                          />
                      </div>
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <input 
                             type="checkbox" 
                             id="restock"
                             checked={cancelForm.restock}
                             onChange={e => setCancelForm({...cancelForm, restock: e.target.checked})}
                             className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor="restock" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none flex items-center">
                              <RefreshCw size={14} className="mr-2 text-gray-400"/>
                              Return items to stock?
                          </label>
                      </div>
                      {selectedOrder?.status === 'COMPLETED' && (
                          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                              ⚠️ This order was already paid. Cancelling will mark it as <strong>REFUNDED</strong>.
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                      <button onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Keep Order</button>
                      <button 
                         onClick={confirmCancel} 
                         disabled={!cancelForm.reason}
                         className="px-4 py-2 bg-red-600 disabled:bg-gray-400 text-white rounded-lg flex items-center"
                      >
                         Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Orders;
