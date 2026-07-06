import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Package, CheckCircle, XCircle, Clock, ClipboardList, Filter, Calendar, X, ShoppingCart } from 'lucide-react';
import { useDispatchStore } from '../store/dispatchStore';
import { buildBackendMap, enrichItem, currentStock, parseNum } from '../utils/inventory';

const STATUS_META = {
  'Waiting for Approval': { label: 'Pending', color: '#f59e0b', badge: 'bg-amber-100 text-amber-700' },
  'Approved': { label: 'Approved', color: '#10b981', badge: 'bg-emerald-100 text-emerald-700' },
  'Rejected': { label: 'Rejected', color: '#ef4444', badge: 'bg-red-100 text-red-700' },
};

const Dashboard = () => {
  const { items, backendItems, fetchBackendData } = useDispatchStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Report data is already fetched by Layout; here we just load the Backend
  // master (for Item Code / MOQ / Order Qty).
  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  const backendMap = useMemo(() => buildBackendMap(backendItems), [backendItems]);

  // Enrich once (adds itemCode, group, moq, orderQty)
  const enriched = useMemo(
    () => items.map(i => enrichItem(i, backendMap)),
    [items, backendMap]
  );

  const uniqueItemNames = useMemo(
    () => ['All', ...new Set(enriched.map(i => i.itemName).filter(Boolean))],
    [enriched]
  );
  const statusOptions = ['All', 'Waiting for Approval', 'Approved', 'Rejected'];

  const filteredItems = useMemo(() => enriched.filter(item => {
    if (startDate || endDate) {
      const d = new Date(item.approvedAt || item.uploadedAt);
      const ds = isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      if (startDate && ds < startDate) return false;
      if (endDate && ds > endDate) return false;
    }
    if (selectedItemName && selectedItemName !== 'All' && item.itemName !== selectedItemName) return false;
    if (selectedStatus && selectedStatus !== 'All' && item.status !== selectedStatus) return false;
    if (parseNum(item.orderQty) <= 0) return false; // hide items that don't need ordering (Order Qty = 0)
    return true;
  }), [enriched, startDate, endDate, selectedItemName, selectedStatus]);

  // Single-pass stats
  const stats = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, reorder = 0, totalOrderQty = 0;
    for (const i of filteredItems) {
      if (i.status === 'Waiting for Approval') pending++;
      else if (i.status === 'Approved') approved++;
      else if (i.status === 'Rejected') rejected++;
      const oq = parseNum(i.orderQty);
      totalOrderQty += oq;
      if (oq > 0) reorder++;
    }
    return { total: filteredItems.length, pending, approved, rejected, reorder, totalOrderQty };
  }, [filteredItems]);

  const statusData = useMemo(() => [
    { name: 'Pending', value: stats.pending, color: STATUS_META['Waiting for Approval'].color },
    { name: 'Approved', value: stats.approved, color: STATUS_META['Approved'].color },
    { name: 'Rejected', value: stats.rejected, color: STATUS_META['Rejected'].color },
  ].filter(s => s.value > 0), [stats]);

  // Top items that need ordering (highest Order Qty)
  const topOrderItems = useMemo(() =>
    filteredItems
      .filter(i => parseNum(i.orderQty) > 0)
      .sort((a, b) => parseNum(b.orderQty) - parseNum(a.orderQty))
      .slice(0, 8)
      .map(i => ({ name: (i.itemName || '').replace(/^[#@\s]+/, '').slice(0, 16), OrderQty: parseNum(i.orderQty) })),
    [filteredItems]
  );

  const clearFilters = () => {
    setStartDate(''); setEndDate(''); setSelectedItemName(''); setSelectedStatus('');
  };
  const hasActiveFilters = startDate || endDate || (selectedItemName && selectedItemName !== 'All') || (selectedStatus && selectedStatus !== 'All');

  const cards = [
    { label: 'Total Items', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'To Reorder', value: stats.reorder, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Filter size={18} /> Filter {hasActiveFilters && `(${filteredItems.length})`}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass-strong p-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Filter size={16} /> Filter Items</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"><X size={14} /> Clear All</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={12} /> Date Range</label>
              <div className="flex gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                <span className="text-slate-400 text-xs self-center">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select value={selectedItemName || 'All'} onChange={(e) => setSelectedItemName(e.target.value === 'All' ? '' : e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {uniqueItemNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
              <select value={selectedStatus || 'All'} onChange={(e) => setSelectedStatus(e.target.value === 'All' ? '' : e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {statusOptions.map(s => <option key={s} value={s}>{s === 'Waiting for Approval' ? 'Pending' : s}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((stat, i) => (
          <div key={i} className="glass hover-lift p-4 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={24} /></div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items to reorder */}
        <div className="glass-strong p-6 rounded-2xl h-[400px] flex flex-col">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Top Items to Reorder</h3>
            <span className="text-xs text-slate-500">Total Order Qty: <b className="text-blue-600">{stats.totalOrderQty}</b></span>
          </div>
          {topOrderItems.length > 0 ? (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOrderItems} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="OrderQty" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No items need reordering</div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="glass-strong p-6 rounded-2xl h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-slate-600">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* Items Overview Table */}
      <div className="glass-strong p-6 rounded-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-slate-800">Items Overview</h3>
          {hasActiveFilters && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{filteredItems.length} of {items.length} items</span>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 w-28">Date</th>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3 w-28 text-right">Reorder Level</th>
                <th className="px-4 py-3 w-24 text-right">Shelf Qty</th>
                <th className="px-4 py-3 w-28 text-right">Current Stock</th>
                <th className="px-4 py-3 w-24 text-right">Order Qty</th>
                <th className="px-4 py-3 text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {filteredItems.slice().reverse().map(item => {
                const meta = STATUS_META[item.status] || STATUS_META['Waiting for Approval'];
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      {new Date(item.approvedAt || item.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-600">{item.shelf1}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{currentStock(item.qty)}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-600">{item.orderQty}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${meta.badge}`}>{meta.label}</span>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 text-sm">No items found matching the selected filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
