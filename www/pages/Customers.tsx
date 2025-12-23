import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Customer } from '../types';
import { Search, Plus, Phone, Mail, User, Edit2, ShoppingBag } from 'lucide-react';

const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, settings, currentOrg } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState<Partial<Customer>>({
     name: '', phone: '', email: '', address: ''
  });

  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleOpenModal = (customer?: Customer) => {
     if (customer) {
        setEditingCustomer(customer);
        setFormData(customer);
     } else {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
     }
     setIsModalOpen(true);
  };

  const handleSave = () => {
     if (!formData.name || !formData.phone) return alert("Name and Phone are required");
     
     const customer: Customer = {
        id: editingCustomer ? editingCustomer.id : `c-${Date.now()}`,
        orgId: editingCustomer ? editingCustomer.orgId : (currentOrg?.id || ''),
        name: formData.name!,
        phone: formData.phone!,
        email: formData.email,
        address: formData.address,
        points: editingCustomer ? editingCustomer.points : 0,
        totalSpent: editingCustomer ? editingCustomer.totalSpent : 0
     };

     if (editingCustomer) {
        updateCustomer(customer);
     } else {
        addCustomer(customer);
     }
     setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Customer Management</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>New Customer</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
         {filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col group hover:border-primary-500 transition-colors">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                     <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                        <User size={24} />
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{customer.name}</h3>
                        <p className="text-sm text-gray-500">Member since {new Date().getFullYear()}</p>
                     </div>
                  </div>
                  <button onClick={() => handleOpenModal(customer)} className="text-gray-400 hover:text-primary-600">
                     <Edit2 size={18} />
                  </button>
               </div>
               
               <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                     <Phone size={14} className="mr-2" />
                     {customer.phone}
                  </div>
                  {customer.email && (
                     <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Mail size={14} className="mr-2" />
                        {customer.email}
                     </div>
                  )}
               </div>

               <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30 -mx-6 -mb-6 p-4 rounded-b-xl">
                  <div>
                     <p className="text-xs text-gray-500 uppercase font-semibold">Total Spent</p>
                     <p className="font-bold text-gray-900 dark:text-white">{currencySymbol}{customer.totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-gray-500 uppercase font-semibold">Points</p>
                     <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">
                        {customer.points} pts
                     </span>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
               <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold dark:text-white">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                     <input
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input
                           className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                           value={formData.phone}
                           onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Optional)</label>
                        <input
                           className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                           value={formData.email}
                           onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address (Optional)</label>
                     <textarea
                        rows={2}
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                     />
                  </div>
               </div>
               <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300">Cancel</button>
                  <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Save Customer</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Customers;