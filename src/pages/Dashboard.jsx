import React, { useEffect, useState } from 'react';
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
  Cell
} from 'recharts';
import { Package, CheckCircle, Truck, Clock, ClipboardList, Filter, Calendar, X } from 'lucide-react';
import { useDispatchStore } from '../store/dispatchStore';

const Dashboard = () => {
  const { items, fetchFromSheet } = useDispatchStore();

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchFromSheet();
  }, [fetchFromSheet]);

  // Get unique item names for dropdown
  const uniqueItemNames = ['All', ...new Set(items.map(item => item.itemName).filter(Boolean))];
  const statusOptions = ['All', 'Waiting for Approval', 'Approved', 'Confirmed', 'Dispatched', 'Rejected'];

  // Filter items based on selected filters
  const filteredItems = items.filter(item => {
    // Date filter
    if (startDate || endDate) {
      const itemDate = new Date(item.dispatchedAt || item.confirmedAt || item.approvedAt || item.uploadedAt);
      const itemDateStr = itemDate.toISOString().split('T')[0];

      if (startDate && itemDateStr < startDate) return false;
      if (endDate && itemDateStr > endDate) return false;
    }

    // Item name filter
    if (selectedItemName && selectedItemName !== 'All' && item.itemName !== selectedItemName) return false;

    // Status filter
    if (selectedStatus && selectedStatus !== 'All' && item.status !== selectedStatus) return false;

    return true;
  });

  const stats = {
    pendingApproval: filteredItems.filter(i => i.status === 'Waiting for Approval').length,
    approved: filteredItems.filter(i => i.status === 'Approved').length,
    confirmed: filteredItems.filter(i => i.status === 'Confirmed').length,
    dispatched: filteredItems.filter(i => i.status === 'Dispatched').length,
    total: filteredItems.length
  };

  const statusData = [
    { name: 'Pending Approval', value: stats.pendingApproval, color: '#f59e0b' },
    { name: 'Approved', value: stats.approved, color: '#3b82f6' },
    { name: 'Confirmed', value: stats.confirmed, color: '#8b5cf6' },
    { name: 'Dispatched', value: stats.dispatched, color: '#10b981' },
  ].filter(s => s.value > 0);

  // Group by date for chart (last 7 days) - using filtered items
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => ({
    date: date.slice(5),
    Confirmed: filteredItems.filter(i => i.status === 'Confirmed' && i.confirmedAt?.startsWith(date)).length,
    Dispatched: filteredItems.filter(i => i.status === 'Dispatched' && i.dispatchedAt?.startsWith(date)).length,
  }));

  // Clear all filters
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedItemName('');
    setSelectedStatus('');
  };

  // Check if any filter is active
  const hasActiveFilters = startDate || endDate || (selectedItemName && selectedItemName !== 'All') || (selectedStatus && selectedStatus !== 'All');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Dispatch Dashboard</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${showFilters || hasActiveFilters
            ? 'bg-blue-50 border-blue-200 text-blue-600'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Filter size={18} /> Filter {hasActiveFilters && `(${filteredItems.length} results)`}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Filter size={16} /> Filter Orders
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <X size={14} /> Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar size={12} /> Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Start Date"
                />
                <span className="text-slate-400 text-xs self-center">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="End Date"
                />
              </div>
            </div>

            {/* Item Name Dropdown Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select
                value={selectedItemName || 'All'}
                onChange={(e) => setSelectedItemName(e.target.value === 'All' ? '' : e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {uniqueItemNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
              <select
                value={selectedStatus || 'All'}
                onChange={(e) => setSelectedStatus(e.target.value === 'All' ? '' : e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
              {startDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  From: {startDate}
                  <button onClick={() => setStartDate('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  To: {endDate}
                  <button onClick={() => setEndDate('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {selectedItemName && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  Item: {selectedItemName}
                  <button onClick={() => setSelectedItemName('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {selectedStatus && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  Status: {selectedStatus}
                  <button onClick={() => setSelectedStatus('')} className="hover:text-blue-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Confirmed', value: stats.confirmed, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Dispatched', value: stats.dispatched, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Weekly Dispatch Trend</h3>
          {filteredItems.length > 0 ? (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="Confirmed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dispatched" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              No data available for selected filters
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-slate-600">{s.name}: {s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              No data available for selected filters
            </div>
          )}
        </div>
      </div>

      {/* Orders Overview Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold text-slate-800">Master Orders Overview</h3>
          {hasActiveFilters && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {filteredItems.length} of {items.length} orders
            </span>
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
                <th className="px-4 py-3 w-28 text-right">Order Qty</th>
                <th className="px-4 py-3 w-28 text-right">Dispatched Qty</th>
                <th className="px-4 py-3 w-28 text-right">Remaining Qty</th>
                <th className="px-4 py-3 w-16 text-center">Unit</th>
                <th className="px-4 py-3 text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {filteredItems.slice().reverse().map(item => {
                const orderedQty = item.orderedQty !== undefined ? item.orderedQty : item.qty;
                const dispatchedQty = item.dispatchedQty !== undefined ? item.dispatchedQty : (item.status === 'Dispatched' ? item.qty : 0);
                const remainingQty = item.remainingQty !== undefined ? item.remainingQty : (item.status === 'Dispatched' ? 0 : item.qty);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      {new Date(item.dispatchedAt || item.confirmedAt || item.approvedAt || item.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{orderedQty}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{dispatchedQty}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{remainingQty}</td>
                    <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{item.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${item.status === 'Dispatched' ? 'bg-blue-100 text-blue-700 shadow-sm' :
                        item.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700 shadow-sm' :
                          item.status === 'Approved' ? 'bg-purple-100 text-purple-700 shadow-sm' :
                            item.status === 'Rejected' ? 'bg-red-100 text-red-700 shadow-sm' :
                              'bg-amber-100 text-amber-700 shadow-sm'
                        }`}>
                        {item.status === 'Waiting for Approval' ? 'Pending' : item.status}
                      </span>
                      {item.remark?.includes('Remaining from') && (
                        <div className="text-[9px] text-amber-600 mt-1 font-bold uppercase">Partial Remaining</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 text-sm">
                    No orders found matching the selected filters
                  </td>
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