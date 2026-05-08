import React, { useEffect } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { generateDummyData } from '../utils/dummyData';
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
import { Package, CheckCircle, Truck, Clock, ClipboardList } from 'lucide-react';

const Dashboard = () => {
  const { items, setItems } = useDispatchStore();

  useEffect(() => {
    if (items.length === 0) {
      const dummy = generateDummyData();
      setItems(dummy);
    }
  }, [items, setItems]);

  const stats = {
    pendingApproval: items.filter(i => i.status === 'Waiting for Approval').length,
    approved: items.filter(i => i.status === 'Approved').length,
    confirmed: items.filter(i => i.status === 'Confirmed').length,
    dispatched: items.filter(i => i.status === 'Dispatched').length,
    total: items.length
  };

  const statusData = [
    { name: 'Pending Approval', value: stats.pendingApproval, color: '#f59e0b' },
    { name: 'Approved', value: stats.approved, color: '#3b82f6' },
    { name: 'Confirmed', value: stats.confirmed, color: '#8b5cf6' },
    { name: 'Dispatched', value: stats.dispatched, color: '#10b981' },
  ];

  // Group by date for chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => ({
    date,
    Confirmed: items.filter(i => i.status === 'Confirmed' && i.confirmedAt?.startsWith(date)).length,
    Dispatched: items.filter(i => i.status === 'Dispatched' && i.dispatchedAt?.startsWith(date)).length,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dispatch Dashboard</h1>
        <div className="text-sm text-slate-500">Ace-Mark System</div>
      </div>

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
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Status Distribution</h3>
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
        </div>
      </div>

      {/* Orders Overview Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Master Orders Overview</h3>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3 w-24 text-right">Qty</th>
                <th className="px-4 py-3 w-16 text-center">Unit</th>
                <th className="px-4 py-3 text-center w-32">Status</th>
                <th className="px-4 py-3 text-center w-32">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {items.slice().reverse().map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.itemDetails}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.itemCode}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.qty}</td>
                  <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{item.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                      item.status === 'Dispatched' ? 'bg-blue-100 text-blue-700 shadow-sm' :
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
                  <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium">
                    {new Date(item.dispatchedAt || item.confirmedAt || item.approvedAt || item.uploadedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">No orders found</td>
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
