import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { analyzeSales } from '../services/geminiService';
import { Sparkles, Download, Loader, TrendingUp, PieChart as PieIcon, Users, Package, ArrowUp, ArrowDown, Search, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import Combobox from '../components/Combobox';

type TimeRange = '7d' | '30d' | 'all';
type SortField = 'name' | 'sold' | 'revenue' | 'profit' | 'margin';
type SortOrder = 'asc' | 'desc';

const Reports: React.FC = () => {
  const { transactions, settings, customers } = useApp();
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  
  // Table State
  const [productSearch, setProductSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const currencySymbol = settings.currency === 'THB' ? '฿' : '$';
  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

  // --- Date Filtering Logic ---
  const filteredTransactions = useMemo(() => {
     if (timeRange === 'all') return transactions;
     
     const now = new Date();
     const cutoff = new Date();
     cutoff.setDate(now.getDate() - (timeRange === '7d' ? 7 : 30));
     
     return transactions.filter(t => new Date(t.date) >= cutoff);
  }, [transactions, timeRange]);

  // --- Aggregation Logic ---
  
  // 1. Product Performance (Revenue & Profit)
  const productPerformance = useMemo(() => {
    const stats: Record<string, { id: string, name: string, sku: string, category: string, sold: number, revenue: number, profit: number }> = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'SALE' && t.fulfillmentStatus === 'DELIVERED' && t.status !== 'CANCELLED') {
        t.items.forEach(item => {
          if (!stats[item.id]) {
            stats[item.id] = { 
                id: item.id, 
                name: item.name, 
                sku: item.sku,
                category: item.category || 'Uncategorized', 
                sold: 0, 
                revenue: 0, 
                profit: 0 
            };
          }
          const itemRevenue = item.price * item.quantity;
          const itemCost = item.lineCost ?? (item.cost * item.quantity);
          stats[item.id].sold += item.quantity;
          stats[item.id].revenue += itemRevenue;
          stats[item.id].profit += (itemRevenue - itemCost);
        });
      }
    });

    return Object.values(stats);
  }, [filteredTransactions]);

  // Filter and Sort for Table
  const sortedProductPerformance = useMemo(() => {
      let data = [...productPerformance];

      if (productSearch) {
          data = data.filter(p => 
              p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
              p.sku.toLowerCase().includes(productSearch.toLowerCase())
          );
      }

      data.sort((a, b) => {
          let aValue: number | string = '';
          let bValue: number | string = '';

          if (sortField === 'name') {
              aValue = a.name;
              bValue = b.name;
          } else if (sortField === 'margin') {
              // Handle division by zero for margin sorting
              aValue = a.revenue !== 0 ? (a.profit / a.revenue) : -Infinity;
              bValue = b.revenue !== 0 ? (b.profit / b.revenue) : -Infinity;
          } else {
              aValue = a[sortField];
              bValue = b[sortField];
          }

          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
      });

      return data;
  }, [productPerformance, productSearch, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
      if (sortField === field) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder('desc');
      }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) return <span className="opacity-0 group-hover:opacity-30"><ArrowDown size={14}/></span>;
      return sortOrder === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>;
  };

  // 2. Category Performance
  const categoryPerformance = useMemo(() => {
      const stats: Record<string, { name: string, revenue: number, profit: number, margin: number }> = {};
      
      productPerformance.forEach(p => {
          if (!stats[p.category]) stats[p.category] = { name: p.category, revenue: 0, profit: 0, margin: 0 };
          stats[p.category].revenue += p.revenue;
          stats[p.category].profit += p.profit;
      });
      
      return Object.values(stats).map(c => ({
          ...c,
          margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0
      })).sort((a,b) => b.revenue - a.revenue);
  }, [productPerformance]);

  // 3. Overall Metrics
  const metrics = useMemo(() => {
     let revenue = 0;
     let cogs = 0;
     let orders = 0;

     filteredTransactions.forEach(t => {
         if (t.type === 'SALE' && t.fulfillmentStatus === 'DELIVERED' && t.status !== 'CANCELLED') {
             revenue += t.total;
             orders += 1;
             t.items.forEach(item => {
                 cogs += (item.lineCost ?? (item.cost * item.quantity));
             });
         }
     });

     return { revenue, cogs, profit: revenue - cogs, orders };
  }, [filteredTransactions]);

  const margin = metrics.revenue > 0 ? (metrics.profit / metrics.revenue) * 100 : 0;
  const aov = metrics.orders > 0 ? metrics.revenue / metrics.orders : 0;

  // 4. Trend Data
  const trendData = useMemo(() => {
      const salesByDate = filteredTransactions.reduce((acc, curr) => {
        if (curr.type !== 'SALE' || curr.fulfillmentStatus !== 'DELIVERED' || curr.status === 'CANCELLED') return acc;
        const date = curr.date.split('T')[0];
        
        if (!acc[date]) acc[date] = { date, revenue: 0, profit: 0 };
        
        acc[date].revenue += curr.total;
        const currCost = curr.items.reduce((s, i) => s + (i.lineCost ?? (i.cost * i.quantity)), 0);
        acc[date].profit += (curr.total - currCost);
        
        return acc;
      }, {} as Record<string, { date: string, revenue: number, profit: number }>);
      
      const values = Object.values(salesByDate) as Array<{ date: string; revenue: number; profit: number }>;
      return values.sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  // Top Customers Logic
  const topCustomers = [...customers].sort((a,b) => b.totalSpent - a.totalSpent).slice(0, 5);

  const handleAIAnalysis = async () => {
    setLoading(true);
    const summary = `
      Total Revenue: ${metrics.revenue}, Profit: ${metrics.profit}, Margin: ${margin.toFixed(1)}%.
      Top Category: ${categoryPerformance[0]?.name} (${categoryPerformance[0]?.revenue}).
      Top Product: ${productPerformance[0]?.name} (${productPerformance[0]?.revenue}).
      Sales Trend: ${trendData.map(d => d.revenue).join(', ')}.
    `;
    const result = await analyzeSales(summary);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Business Analytics</h1>
           <p className="text-gray-500 text-sm">Deep dive into revenue, profit, and inventory performance</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-40">
             <Combobox 
                options={[
                   { value: '7d', label: 'Last 7 Days' },
                   { value: '30d', label: 'Last 30 Days' },
                   { value: 'all', label: 'All Time' }
                ]}
                value={timeRange}
                onChange={(val) => setTimeRange(val as TimeRange)}
             />
           </div>
           <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg transition-colors">
             <Download size={18} />
             <span className="hidden sm:inline">Export</span>
           </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currencySymbol}{metrics.revenue.toLocaleString()}</h3>
         </div>
         <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gross Profit</p>
            <h3 className={`text-2xl font-bold mt-1 ${metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.profit < 0 ? '-' : ''}{currencySymbol}{Math.abs(metrics.profit).toLocaleString()}
            </h3>
            <p className={`text-xs mt-1 font-medium ${metrics.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {margin.toFixed(1)}% Margin
            </p>
         </div>
         <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Avg. Order Value</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{currencySymbol}{aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
         </div>
         <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metrics.orders}</h3>
         </div>
      </div>

      {/* Row 1: Trends & Category Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Revenue vs Profit Trend */}
         <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary-600"/> Revenue vs Profit
               </h3>
            </div>
            <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                     <XAxis dataKey="date" stroke="#888888" fontSize={12} tickFormatter={str => str.slice(5)} />
                     <YAxis stroke="#888888" fontSize={12} tickFormatter={val => `${currencySymbol}${val/1000}k`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, '']}
                     />
                     <Legend />
                     <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRev)" />
                     <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProf)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Category Performance (Bar Chart) */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
            <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
               <PieIcon size={20} className="text-purple-500"/> Category Performance
            </h3>
            <div className="flex-1 min-h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryPerformance} layout="vertical" margin={{ left: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" width={80} stroke="#888888" fontSize={11} />
                     <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, '']}
                     />
                     <Legend />
                     <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={10} />
                     <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Row 2: Product Performance Table (FULL LIST) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[600px]">
         <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <Package size={20} className="text-blue-500"/> Product Performance
             </h3>
             <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input 
                   type="text" 
                   placeholder="Search products..." 
                   className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                   value={productSearch}
                   onChange={e => setProductSearch(e.target.value)}
                />
             </div>
         </div>
         <div className="overflow-auto flex-1">
             <table className="w-full text-left">
                 <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 sticky top-0 z-10">
                     <tr>
                         <th onClick={() => handleSort('name')} className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group select-none">
                             <div className="flex items-center gap-1">Product Name <SortIcon field="name"/></div>
                         </th>
                         <th className="px-6 py-3">Category</th>
                         <th onClick={() => handleSort('sold')} className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group select-none">
                             <div className="flex items-center justify-end gap-1">Units Sold <SortIcon field="sold"/></div>
                         </th>
                         <th onClick={() => handleSort('revenue')} className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group select-none">
                             <div className="flex items-center justify-end gap-1">Revenue <SortIcon field="revenue"/></div>
                         </th>
                         <th onClick={() => handleSort('profit')} className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group select-none">
                             <div className="flex items-center justify-end gap-1">Profit <SortIcon field="profit"/></div>
                         </th>
                         <th onClick={() => handleSort('margin')} className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group select-none">
                             <div className="flex items-center justify-end gap-1">Margin <SortIcon field="margin"/></div>
                         </th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                     {sortedProductPerformance.map(p => {
                         const margin = p.revenue !== 0 ? (p.profit / p.revenue) * 100 : 0;
                         const isLoss = p.profit < 0;
                         return (
                             <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isLoss ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                 <td className="px-6 py-4">
                                     <div className="flex items-center gap-2">
                                         {isLoss && <AlertCircle size={14} className="text-red-500"/>}
                                         <div>
                                            <div className={`font-medium ${isLoss ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.sku}</div>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                        {p.category}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                                     {p.sold}
                                 </td>
                                 <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                                     {currencySymbol}{p.revenue.toLocaleString()}
                                 </td>
                                 <td className={`px-6 py-4 text-right font-medium ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                     {p.profit < 0 ? '-' : ''}{currencySymbol}{Math.abs(p.profit).toLocaleString()}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <span className={`text-xs font-bold px-2 py-1 rounded 
                                        ${margin >= 40 ? 'bg-green-100 text-green-700' 
                                        : margin >= 20 ? 'bg-yellow-100 text-yellow-700' 
                                        : 'bg-red-100 text-red-700'}`}>
                                        {margin.toFixed(0)}%
                                     </span>
                                 </td>
                             </tr>
                         );
                     })}
                     {sortedProductPerformance.length === 0 && (
                         <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No sales data found</td></tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* Row 3: Customers & AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
             <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                 <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-orange-500"/> VIP Customers
                 </h3>
                 <button className="text-sm text-primary-600 hover:underline">View All</button>
             </div>
             <div className="p-0">
                 <table className="w-full text-left">
                     <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500">
                         <tr>
                             <th className="px-6 py-3">Customer</th>
                             <th className="px-6 py-3 text-right">Points</th>
                             <th className="px-6 py-3 text-right">Total Spent</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {topCustomers.map(c => (
                             <tr key={c.id}>
                                 <td className="px-6 py-4">
                                     <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                                     <div className="text-xs text-gray-500">{c.phone}</div>
                                 </td>
                                 <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                                     <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">{c.points}</span>
                                 </td>
                                 <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                     {currencySymbol}{c.totalSpent.toLocaleString()}
                                 </td>
                             </tr>
                         ))}
                         {topCustomers.length === 0 && (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No customer data available</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="text-yellow-300" />
                  <h2 className="text-lg font-bold">AI Strategic Insights</h2>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line mb-4 min-h-[120px]">
                  {analysis || (loading ? "Crunching the numbers..." : "Tap the button below to generate AI-powered insights on profit margins, sales trends, and inventory optimization opportunities.")}
              </div>
              <button
                  onClick={handleAIAnalysis}
                  disabled={loading}
                  className="self-start bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 disabled:opacity-80 flex items-center transition-all shadow-lg"
              >
                  {loading ? <Loader className="animate-spin mr-2" size={16} /> : <Sparkles size={16} className="mr-2"/>}
                  {analysis ? 'Update Analysis' : 'Analyze Data'}
              </button>
          </div>
      </div>
    </div>
  );
};

export default Reports;
