import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Moon, Sun, Globe, DollarSign, Plus, Users, Building2, Store } from 'lucide-react';
import Combobox from '../components/Combobox';

const Settings: React.FC = () => {
  const { settings, updateSettings, user, currentOrg, branches, createBranch, orgUsers, createUser } = useApp();
  const [branchForm, setBranchForm] = useState({ name: '', address: '', isMain: false });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'STAFF' as any, branchId: '' });
  const [savingBranch, setSavingBranch] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const canManageOrg = user?.role === 'PLATFORM_ADMIN' || user?.role === 'ORG_ADMIN';

  const branchOptions = useMemo(
    () => branches.map(b => ({ value: b.id, label: b.name, subLabel: b.isMain ? 'Main' : b.address || '' })),
    [branches],
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
         <h2 className="text-lg font-semibold mb-4 dark:text-white">Organization Profile</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-sm text-gray-500 mb-1">Organization Name</label>
               <input disabled value={currentOrg?.name || ''} className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300" />
            </div>
            <div>
               <label className="block text-sm text-gray-500 mb-1">Current User</label>
               <input disabled value={user?.name || ''} className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300" />
            </div>
         </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
         <h2 className="text-lg font-semibold mb-4 dark:text-white">Appearance</h2>
         <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
               {settings.isDark ? <Moon className="text-purple-400" /> : <Sun className="text-orange-400" />}
               <div>
                  <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                  <p className="text-sm text-gray-500">Adjust the appearance of the application</p>
               </div>
            </div>
            <button
               onClick={() => updateSettings({ isDark: !settings.isDark })}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.isDark ? 'bg-primary-600' : 'bg-gray-200'}`}
            >
               <span
                 className={`${settings.isDark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
               />
            </button>
         </div>
      </div>

      {/* Localization */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
         <h2 className="text-lg font-semibold mb-4 dark:text-white">Localization</h2>
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                  <Globe className="text-blue-500" />
                  <div>
                     <p className="font-medium text-gray-900 dark:text-white">Language</p>
                     <p className="text-sm text-gray-500">Select interface language</p>
                  </div>
               </div>
               <div className="flex space-x-2">
                  <button
                    onClick={() => updateSettings({ language: 'en' })}
                    className={`px-3 py-1 rounded-lg text-sm border ${settings.language === 'en' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 dark:border-gray-600 dark:text-gray-300'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => updateSettings({ language: 'th' })}
                    className={`px-3 py-1 rounded-lg text-sm border ${settings.language === 'th' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-300 dark:border-gray-600 dark:text-gray-300'}`}
                  >
                    ไทย
                  </button>
               </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                  <DollarSign className="text-green-500" />
                  <div>
                     <p className="font-medium text-gray-900 dark:text-white">Currency</p>
                     <p className="text-sm text-gray-500">Select display currency</p>
                  </div>
               </div>
               <div className="w-40">
                 <Combobox
                   options={[{ value: 'THB', label: 'THB (฿)' }, { value: 'USD', label: 'USD ($)' }]}
                   value={settings.currency}
                   onChange={(val) => updateSettings({ currency: val as any })}
                 />
               </div>
            </div>
         </div>
      </div>

      {/* Branch Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store className="text-primary-600" />
            <h2 className="text-lg font-semibold dark:text-white">Branches</h2>
          </div>
        </div>

        <div className="space-y-2">
          {branches.map(b => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {b.name}
                  {b.isMain && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">Main</span>}
                </div>
                {b.address && <div className="text-sm text-gray-500">{b.address}</div>}
              </div>
            </div>
          ))}
          {branches.length === 0 && <div className="text-sm text-gray-500">No branches yet.</div>}
        </div>

        {canManageOrg && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <Plus size={16} /> Add Branch
            </h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <input
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={branchForm.name}
                  onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Siam Paragon Kiosk"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Address (Optional)</label>
                <input
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={branchForm.address}
                  onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g. Bangkok"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={branchForm.isMain}
                onChange={e => setBranchForm(prev => ({ ...prev, isMain: e.target.checked }))}
              />
              Set as main branch
            </label>
            <div className="mt-4 flex justify-end">
              <button
                disabled={savingBranch || !branchForm.name.trim()}
                onClick={async () => {
                  setSavingBranch(true);
                  try {
                    await createBranch({ name: branchForm.name.trim(), address: branchForm.address.trim() || undefined, isMain: branchForm.isMain });
                    setBranchForm({ name: '', address: '', isMain: false });
                  } finally {
                    setSavingBranch(false);
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:bg-gray-400"
              >
                {savingBranch ? 'Saving…' : 'Create Branch'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-primary-600" />
            <h2 className="text-lg font-semibold dark:text-white">Users</h2>
          </div>
        </div>

        <div className="space-y-2">
          {orgUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">{u.name}</div>
                <div className="text-sm text-gray-500 truncate">{u.email}</div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div className="font-semibold">{u.role?.replace('_', ' ')}</div>
                {u.branchId && <div className="truncate">Branch: {branches.find(b => b.id === u.branchId)?.name || u.branchId}</div>}
              </div>
            </div>
          ))}
          {orgUsers.length === 0 && <div className="text-sm text-gray-500">No users loaded (admins only).</div>}
        </div>

        {canManageOrg && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold dark:text-white flex items-center gap-2">
              <Plus size={16} /> Add User
            </h3>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <input
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={userForm.name}
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Staff name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <input
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={userForm.email}
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={userForm.password}
                  onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Temporary password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Role</label>
                <Combobox
                  options={[
                    { value: 'ORG_ADMIN', label: 'Org Admin', subLabel: 'Full access' },
                    { value: 'BRANCH_MANAGER', label: 'Branch Manager', subLabel: 'Inventory + orders + purchasing' },
                    { value: 'STAFF', label: 'Staff', subLabel: 'POS + basic operations' },
                  ]}
                  value={userForm.role}
                  onChange={val => setUserForm(prev => ({ ...prev, role: val as any }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-500 mb-1">Branch (Optional; required for Staff)</label>
                <Combobox
                  options={branchOptions}
                  value={userForm.branchId}
                  onChange={val => setUserForm(prev => ({ ...prev, branchId: val }))}
                  placeholder="Select branch"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                disabled={
                  savingUser ||
                  !userForm.name.trim() ||
                  !userForm.email.trim() ||
                  !userForm.password ||
                  (userForm.role === 'STAFF' && !userForm.branchId)
                }
                onClick={async () => {
                  setSavingUser(true);
                  try {
                    await createUser({
                      name: userForm.name.trim(),
                      email: userForm.email.trim(),
                      password: userForm.password,
                      role: userForm.role,
                      branchId: userForm.branchId || undefined,
                    });
                    setUserForm({ name: '', email: '', password: '', role: 'STAFF' as any, branchId: '' });
                  } finally {
                    setSavingUser(false);
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:bg-gray-400"
              >
                {savingUser ? 'Saving…' : 'Create User'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
