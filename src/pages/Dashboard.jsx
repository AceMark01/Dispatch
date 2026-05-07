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
import { Package, CheckCircle, Truck, Clock } from 'lucide-react';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
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
    </div>
  );
};

export default Dashboard;
