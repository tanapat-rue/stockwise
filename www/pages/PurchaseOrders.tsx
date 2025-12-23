import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { PurchaseOrder, PurchaseOrderItem } from '../types';
import { Plus, Search, CheckCircle, Clock, XCircle, X, PlusCircle, Trash2, MapPin } from 'lucide-react';
import Combobox from '../components/Combobox';

const PurchaseOrders: React.FC = () => {
  const { purchaseOrders, suppliers, products, createPurchaseOrder, receivePurchaseOrder, settings, branches, currentBranch, getStock } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';

  // --- Create PO Form State ---
  const [newPO, setNewPO] = useState<{
    referenceNo: string;
    supplierId: string;
    branchId: string;
    items: PurchaseOrderItem[];
  }>({
    referenceNo: '',
    supplierId: '',
    branchId: '',
    items: []
  });

  const handleOpenModal = () => {
    setNewPO({
      referenceNo: '',
      supplierId: suppliers[0]?.id || '',
      branchId: currentBranch?.id || branches[0]?.id || '',
      items: []
    });
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    setNewPO(prev => ({
      ...prev,
      items: [...prev.items, { productId: products[0].id, productName: products[0].name, quantity: 1, unitCost: products[0].cost }]
    }));
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setNewPO(prev => {
       const newItems = [...prev.items];
       newItems[index] = { ...newItems[index], [field]: value };
       
       if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
             newItems[index].productName = product.name;
             newItems[index].unitCost = product.cost;
          }
       }
       return { ...prev, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    setNewPO(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleCreatePO = () => {
    if (!newPO.supplierId || newPO.items.length === 0) return alert("Select supplier and add at least one item.");
    
    const totalCost = newPO.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    
    const po: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orgId: branches[0].orgId, // assume context valid
      branchId: newPO.branchId,
      date: new Date().toISOString(),
      status: 'OPEN',
      referenceNo: newPO.referenceNo,
      supplierId: newPO.supplierId,
      items: newPO.items,
      totalCost
    };
    
    createPurchaseOrder(po);
    setIsModalOpen(false);
  };

  const filteredPOs = purchaseOrders.filter(po => 
    po.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    suppliers.find(s => s.id === po.supplierId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Purchase Orders</h1>
        <button
          onClick={handleOpenModal}
          disabled={suppliers.length === 0}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>New Purchase Order</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search PO number or supplier..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
         <table className="w-full text-left">
           <thead className="bg-gray-50 dark:bg-gray-700/50">
             <tr>
               <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Reference</th>
               <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Supplier</th>
               <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Target Branch</th>
               <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
               <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Total</th>
               <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
             {filteredPOs.map(po => {
               const supplierName = suppliers.find(s => s.id === po.supplierId)?.name || 'Unknown';
               const branchName = branches.find(b => b.id === po.branchId)?.name || 'Unknown';
               return (
                 <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{po.referenceNo}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{supplierName}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                       <div className="flex items-center gap-1"><MapPin size={12}/> {branchName}</div>
                    </td>
                    <td className="p-4">
                       <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                          ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 
                            po.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                            po.status === 'RECEIVING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'}`}>
                          {po.status === 'RECEIVED' ? <CheckCircle size={12} /> : 
                           po.status === 'OPEN' ? <Clock size={12} /> :
                           po.status === 'RECEIVING' ? <Clock size={12} /> : <XCircle size={12} />}
                          <span>{po.status}</span>
                       </span>
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900 dark:text-white">{currencySymbol}{po.totalCost.toLocaleString()}</td>
                    <td className="p-4 text-center">
                       {po.status === 'OPEN' && (
                          <button 
                             onClick={() => receivePurchaseOrder(po.id)}
                             className="text-sm bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded border border-green-200"
                          >
                             Receive Stock
                          </button>
                       )}
                       {po.status === 'RECEIVED' && <span className="text-xs text-gray-400">Received {new Date(po.receivedDate!).toLocaleDateString()}</span>}
                    </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Create Purchase Order</h2>
                <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-500" /></button>
             </div>
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Reference</label>
                      <input
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        placeholder="Auto (leave blank)"
                        value={newPO.referenceNo}
                        onChange={e => setNewPO({ ...newPO, referenceNo: e.target.value })}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                      <Combobox
                         options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                         value={newPO.supplierId}
                         onChange={(val) => setNewPO({ ...newPO, supplierId: val })}
                         placeholder="Select Supplier"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination Branch</label>
                      <Combobox
                         options={branches.map(b => ({ value: b.id, label: b.name }))}
                         value={newPO.branchId}
                         onChange={(val) => setNewPO({ ...newPO, branchId: val })}
                         placeholder="Select Branch"
                      />
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold dark:text-white">Items</h3>
                      <button onClick={handleAddItem} className="text-primary-600 flex items-center text-sm font-medium"><PlusCircle size={16} className="mr-1"/> Add Item</button>
                   </div>
                   <div className="space-y-3">
                      {newPO.items.map((item, index) => (
                         <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1">
                               <label className="block text-xs text-gray-500 mb-1">Product</label>
                               <Combobox
                                  options={products.map(p => ({
                                      value: p.id,
                                      label: p.name,
                                      subLabel: `Stock: ${getStock(p.id, newPO.branchId)} | Cost: ${p.cost}`,
                                      image: p.image
                                  }))}
                                  value={item.productId}
                                  onChange={(val) => updateItem(index, 'productId', val)}
                               />
                            </div>
                            <div className="w-24">
                               <label className="block text-xs text-gray-500 mb-1">Qty</label>
                               <input
                                  type="number"
                                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                  value={item.quantity || ''}
                                  onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                               />
                            </div>
                            <div className="w-24">
                               <label className="block text-xs text-gray-500 mb-1">Cost</label>
                               <input
                                  type="number"
                                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                                  value={item.unitCost || ''}
                                  onChange={e => updateItem(index, 'unitCost', Number(e.target.value))}
                               />
                            </div>
                            <button onClick={() => removeItem(index)} className="p-2 mt-6 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                         </div>
                      ))}
                      {newPO.items.length === 0 && <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">No items added.</p>}
                   </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                   <div className="text-right">
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                         {currencySymbol}{newPO.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toLocaleString()}
                      </p>
                   </div>
                </div>
             </div>
             <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                <button onClick={handleCreatePO} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Create Order</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
