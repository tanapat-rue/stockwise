import React from 'react';
import { useApp } from '../contexts/AppContext';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, Calendar, Activity, ArrowUpRight, PlusCircle, ShoppingCart, Truck, Clock, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { products, transactions, settings, user, getStock, getStockLevel, getAvailableStock } = useApp();
  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // --- Metrics Calculation ---

  // 1. Sales Performance
  const getDailyTotal = (dateStr: string) => 
    transactions.filter(t => t.date.startsWith(dateStr) && t.type === 'SALE' && t.status !== 'CANCELLED').reduce((sum, t) => sum + t.total, 0);
  
  const salesToday = getDailyTotal(todayStr);
  const salesYesterday = getDailyTotal(yesterdayStr);
  
  const salesGrowth = salesYesterday === 0 ? 100 : ((salesToday - salesYesterday) / salesYesterday) * 100;

  // 2. Operational Metrics
  const pendingShipments = transactions.filter(t => 
    t.type === 'SALE' && 
    ['PENDING', 'PICKED', 'PACKED', 'SHIPPED'].includes(t.fulfillmentStatus)
  ).length;

  const lowStockItems = products.filter(p => {
    const minStock = getStockLevel(p.id)?.minStock ?? 5;
    return getAvailableStock(p.id) <= minStock;
  });
  const totalStockValue = products.reduce((sum, p) => sum + (p.cost * getStock(p.id)), 0);

  // 3. Channel Distribution
  const channelData = transactions
    .filter(t => t.date.startsWith(todayStr) && t.type === 'SALE' && t.status !== 'CANCELLED')
    .reduce((acc, curr) => {
       acc[curr.channel] = (acc[curr.channel] || 0) + curr.total;
       return acc;
    }, {} as Record<string, number>);

  const pieData = Object.keys(channelData).map(key => ({ name: key, value: channelData[key] }));
  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  // 4. Chart Data (Last 7 Days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    return { name: dateStr.slice(5), sales: getDailyTotal(dateStr) };
  });

  const canViewFinancials = ['PLATFORM_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white animate-slide-up">
             Overview
           </h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">
             Activity for {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
            <Link to="/pos" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm hover:shadow-md transition-all">
                <ShoppingCart size={16} className="mr-2"/> New Sale
            </Link>
             <Link to="/orders" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm transition-all">
                <Truck size={16} className="mr-2"/> Ship Orders
                {pendingShipments > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingShipments}</span>}
            </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Sales Today</p>
                 <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {canViewFinancials ? `${currencySymbol}${salesToday.toLocaleString()}` : '***'}
                 </h3>
                 <div className={`flex items-center mt-2 text-xs font-medium ${salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {salesGrowth >= 0 ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                    <span>{Math.abs(salesGrowth).toFixed(1)}% vs yesterday</span>
                 </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                 <DollarSign size={24} />
              </div>
           </div>
        </div>

        {/* Operations Card */}
        <Link to="/orders" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-500 transition-colors cursor-pointer group">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pending Shipments</p>
                 <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-primary-600 transition-colors">
                    {pendingShipments}
                 </h3>
                 <p className="text-xs text-gray-400 mt-2">Orders need packing/shipping</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl">
                 <Package size={24} />
              </div>
           </div>
        </Link>

        {/* Stock Value Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Inventory Value</p>
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currencySymbol}{totalStockValue.toLocaleString()}</h3>
                 <p className="text-xs text-gray-400 mt-2">{products.length} distinct SKUs</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                 <Activity size={24} />
              </div>
           </div>
        </div>

        {/* Alerts Card */}
        <Link to="/inventory" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Low Stock Alerts</p>
                 <h3 className={`text-3xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {lowStockItems.length}
                 </h3>
                 <p className="text-xs text-gray-400 mt-2">Items below min. level</p>
              </div>
              <div className={`p-3 rounded-xl ${lowStockItems.length > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 animate-pulse' : 'bg-green-50 dark:bg-green-900/20 text-green-600'}`}>
                 <AlertTriangle size={24} />
              </div>
           </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-lg dark:text-white">Revenue Trend (7 Days)</h3>
           </div>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                 <XAxis dataKey="name" stroke="#888888" fontSize={12} axisLine={false} tickLine={false} />
                 <YAxis stroke="#888888" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000}k`} />
                 <Tooltip
                   cursor={{ fill: 'transparent' }}
                   contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                   itemStyle={{ color: '#fff' }}
                   formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Revenue']}
                 />
                 <Bar dataKey="sales" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={1500} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
           <h3 className="font-bold text-lg dark:text-white mb-2">Sales by Channel (Today)</h3>
           {pieData.length > 0 ? (
               <div className="flex-1 h-64">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie
                               data={pieData}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                           >
                               {pieData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                           </Pie>
                           <Tooltip 
                                formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Sales']}
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                           />
                           <Legend verticalAlign="bottom" height={36}/>
                       </PieChart>
                   </ResponsiveContainer>
               </div>
           ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                   <Clock size={48} className="mb-2 opacity-20"/>
                   <p>No sales data today</p>
               </div>
           )}
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg dark:text-white">Recent Activity</h3>
              <Link to="/reports" className="text-sm text-primary-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              t.type === 'SALE' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 
                              t.type === 'STOCK_IN' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20' : 'bg-gray-100 text-gray-600'
                          }`}>
                              {t.type === 'SALE' ? <ShoppingCart size={18} /> : <Package size={18} />}
                          </div>
                          <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {t.type === 'SALE' ? `Order ${t.id}` : `Stock Adjustment`}
                              </p>
                              <p className="text-xs text-gray-500">
                                  {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {t.channel}
                              </p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className={`text-sm font-bold ${t.type === 'SALE' ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                              {t.type === 'SALE' ? '+' : ''}{currencySymbol}{Math.abs(t.total).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">{t.status}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
