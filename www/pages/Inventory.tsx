import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, X, Eye, ArrowDown, ArrowLeftRight, MapPin, Box, Archive, Info } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { generateProductDescription } from '../services/geminiService';

const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, adjustStock, updateBinLocation, uploadProductImage, settings, user, getStock, getAllocatedStock, getAvailableStock, getStockLevel, currentBranch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isBinModalOpen, setIsBinModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockActionProduct, setStockActionProduct] = useState<Product | null>(null);
  const [stockActionType, setStockActionType] = useState<'STOCK_IN' | 'ADJUSTMENT'>('STOCK_IN');
  
  // Forms
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', sku: '', category: CATEGORIES[0], price: 0, cost: 0, description: ''
  });
  const [stockForm, setStockForm] = useState({ quantity: 0, note: '' });
  const [binForm, setBinForm] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';
  const isReadOnly = user?.role === 'STAFF';

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Handlers ---
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm(product);
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', sku: '', category: CATEGORIES[0], price: 0, cost: 0, description: '' });
    }
    setImageFile(null);
    setIsProductModalOpen(true);
  };

  const handleOpenStockModal = (product: Product, type: 'STOCK_IN' | 'ADJUSTMENT') => {
    setStockActionProduct(product);
    setStockActionType(type);
    setStockForm({ quantity: 0, note: '' });
    setIsStockModalOpen(true);
  };

  const handleOpenBinModal = (product: Product) => {
      setStockActionProduct(product);
      const stockLevel = getStockLevel(product.id);
      setBinForm(stockLevel?.binLocation || '');
      setIsBinModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (isReadOnly) return;
    if (!productForm.name || !productForm.sku) return alert("Name and SKU are required");

    const product: Product = {
      id: editingProduct ? editingProduct.id : `p-${Date.now()}`,
      orgId: editingProduct?.orgId || 'org_1', 
      sku: productForm.sku!,
      name: productForm.name!,
      description: productForm.description || '',
      price: Number(productForm.price),
      cost: editingProduct?.cost ?? 0,
      category: productForm.category || 'General',
      image: editingProduct?.image,
      imageKey: editingProduct?.imageKey,
    };

    try {
      if (editingProduct) {
        const updated = await updateProduct(product);
        if (updated && imageFile) await uploadProductImage(updated.id, imageFile);
      } else {
        const created = await addProduct(product);
        if (created && imageFile) await uploadProductImage(created.id, imageFile);
      }
      setIsProductModalOpen(false);
    } catch (e: any) {
      alert(e?.message || 'Failed to save product');
    }
  };

  const handleSubmitStock = () => {
    if (!stockActionProduct) return;
    adjustStock(stockActionProduct.id, Number(stockForm.quantity), stockActionType, stockForm.note);
    setIsStockModalOpen(false);
  };

  const handleSaveBin = () => {
      if(!stockActionProduct) return;
      updateBinLocation(stockActionProduct.id, binForm);
      setIsBinModalOpen(false);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
          <div className="flex items-center text-sm text-gray-500 mt-1">
             <MapPin size={14} className="mr-1"/>
             <span>Branch: <span className="font-semibold text-primary-600">{currentBranch?.name}</span></span>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => handleOpenProductModal()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>Add Product</span>
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search name or SKU..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
            <tr>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Product</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:table-cell">Warehouse Info</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-right">Cost/Price</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">Stock Breakdown</th>
              <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredProducts.map(product => {
              const stockLevel = getStockLevel(product.id);
              const available = getAvailableStock(product.id); // From context
              const allocated = getAllocatedStock(product.id); // From context
              // Approximate physical on hand for visualization: Available + Allocated
              const onHand = available + allocated;
              const bin = stockLevel?.binLocation || 'Unassigned';
              const minStock = stockLevel?.minStock ?? 5;

              return (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                        {product.name?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-1">
                          <Archive size={12} className="text-gray-400"/>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                             Bin: {bin}
                          </span>
                      </div>
                      <div className="flex items-center space-x-1">
                          <Box size={12} className="text-gray-400"/>
                          <span className="text-xs">{product.weight ? `${product.weight}g` : 'No Weight'}</span>
                      </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                   <div className="flex flex-col text-sm">
                      <span className="text-gray-900 dark:text-white font-medium">{currencySymbol}{product.price}</span>
                      <span className="text-gray-400 text-xs">Cost: {currencySymbol}{product.cost}</span>
                   </div>
                </td>
                <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-2 text-xs">
                             <div className="text-center">
                                 <span className="block font-bold text-gray-900 dark:text-white">{onHand}</span>
                                 <span className="text-gray-400">On Hand</span>
                             </div>
                             <div className="text-center text-orange-500">
                                 <span className="block font-bold">{allocated}</span>
                                 <span className="opacity-70">Allocated</span>
                             </div>
                             <div className="text-center text-green-600">
                                 <span className="block font-bold">{available}</span>
                                 <span className="opacity-70">Avail</span>
                             </div>
                        </div>
                        {available <= minStock && <span className="text-xs text-red-500 bg-red-50 px-2 rounded-full">Low Stock</span>}
                    </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                     {!isReadOnly && (
                       <>
                        <button onClick={() => handleOpenStockModal(product, 'STOCK_IN')} title="Restock" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><ArrowDown size={14} /></button>
                        <button onClick={() => handleOpenBinModal(product)} title="Edit Location" className="p-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100"><Archive size={14} /></button>
                       </>
                     )}
                    <button onClick={() => handleOpenProductModal(product)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                       {isReadOnly ? <Eye size={16} /> : <Edit2 size={16} />}
                    </button>
                    {!isReadOnly && (
                      <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Stock Modal reused... */}
      {isStockModalOpen && stockActionProduct && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
                 <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">
                       {stockActionType === 'STOCK_IN' ? 'Restock Product' : 'Adjust Stock'}
                    </h2>
                    <p className="text-sm text-gray-500">{stockActionProduct.name}</p>
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <p>Current On Hand: <strong>{getAvailableStock(stockActionProduct.id) + getAllocatedStock(stockActionProduct.id)}</strong></p>
                        <p>Allocated (Orders): <strong>{getAllocatedStock(stockActionProduct.id)}</strong></p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {stockActionType === 'STOCK_IN' ? 'Quantity to Add' : 'Adjustment (+/-)'}
                       </label>
                       <input
                          type="number"
                          autoFocus
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          value={stockForm.quantity || ''}
                          onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                       <textarea
                          rows={2}
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                          value={stockForm.note}
                          onChange={e => setStockForm({ ...stockForm, note: e.target.value })}
                       />
                    </div>
                 </div>
                 <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                    <button onClick={handleSubmitStock} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Confirm</button>
                 </div>
             </div>
         </div>
      )}

      {/* Bin Modal and Product Modal (Same as before but keeping structure) */}
      {isBinModalOpen && stockActionProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-xl font-bold dark:text-white">Edit Warehouse Location</h2>
                      <p className="text-sm text-gray-500">{stockActionProduct.name}</p>
                  </div>
                  <div className="p-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bin / Shelf ID</label>
                      <input
                          type="text"
                          autoFocus
                          placeholder="e.g. A-01-02"
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white uppercase"
                          value={binForm}
                          onChange={e => setBinForm(e.target.value.toUpperCase())}
                      />
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                      <button onClick={() => setIsBinModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                      <button onClick={handleSaveBin} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Save Location</button>
                  </div>
              </div>
          </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <h2 className="text-xl font-bold dark:text-white">{editingProduct ? 'Edit Product' : 'New Product'}</h2>
                 <button onClick={() => setIsProductModalOpen(false)}><X size={24} className="text-gray-500"/></button>
             </div>
             <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={productForm.name} onChange={e=>setProductForm({...productForm, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
                    <input className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={productForm.sku} onChange={e=>setProductForm({...productForm, sku: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Image</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      onChange={e => setImageFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 5MB (JPG/PNG/WebP). Stored in your org’s MinIO.</p>
                 </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                        <input type="number" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={productForm.price || ''} onChange={e=>setProductForm({...productForm, price: Number(e.target.value)})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost (from POs)</label>
                        <input
                          type="number"
                          disabled
                          className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                          value={editingProduct?.cost ?? 0}
                        />
                     </div>
                  </div>
             </div>
             <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                 <button onClick={()=>setIsProductModalOpen(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                 <button onClick={handleSaveProduct} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Save</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
