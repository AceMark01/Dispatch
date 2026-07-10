import React, { useState, useEffect, useMemo } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Search, Filter, CheckCircle, XCircle, ShoppingCart, ClipboardList, Layers, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { currentStock, buildBackendMap, enrichItem, parseNum } from '../utils/inventory';
import ShareOrderButton from '../components/ShareOrderButton';

const fmtDate = (d) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? 'Unknown date' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ApprovedPage = () => {
  const { items, backendItems, fetchBackendData } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Approved'); // 'Approved' | 'Rejected'
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState(null); // an upload date -> drill into that day's items

  useEffect(() => { fetchBackendData(); }, [fetchBackendData]);
  const backendMap = useMemo(() => buildBackendMap(backendItems), [backendItems]);

  // Enrich once and keep only order-worthy items
  const enrichedApproved = useMemo(
    () => items.filter(i => i.status === 'Approved').map(i => enrichItem(i, backendMap)).filter(i => i.orderQty > 0),
    [items, backendMap]
  );
  const enrichedRejected = useMemo(
    () => items.filter(i => i.status === 'Rejected').map(i => enrichItem(i, backendMap)).filter(i => i.orderQty > 0),
    [items, backendMap]
  );

  const isRejected = activeTab === 'Rejected';
  const shownItems = isRejected ? enrichedRejected : enrichedApproved;

  // Search + group filter (not date)
  const searchFiltered = useMemo(() => shownItems.filter(i => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (i.itemName || '').toLowerCase().includes(q) ||
      (i.group || '').toLowerCase().includes(q) ||
      (i.item || '').toLowerCase().includes(q) ||
      String(i.serialNo || '').toLowerCase().includes(q);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    return matchesSearch && matchesGroup;
  }), [shownItems, search, filterGroup]);

  // Group by upload (order) date — with count, total qty and the confirmation date
  const byDate = useMemo(() => {
    const map = new Map();
    searchFiltered.forEach(i => {
      const key = fmtDate(i.uploadedAt);
      if (!map.has(key)) map.set(key, { date: key, ts: new Date(i.uploadedAt).getTime() || 0, items: 0, qty: 0, confirmTs: 0 });
      const g = map.get(key);
      g.items++;
      g.qty += parseNum(i.orderQty);
      const ct = new Date(i.approvedAt || i.actual1 || 0).getTime() || 0;
      if (ct > g.confirmTs) g.confirmTs = ct;
    });
    return [...map.values()].sort((a, b) => b.ts - a.ts);
  }, [searchFiltered]);

  // Items for the drilled-in date (or all when none selected)
  const filteredItems = useMemo(
    () => dateFilter ? searchFiltered.filter(i => fmtDate(i.uploadedAt) === dateFilter) : searchFiltered,
    [searchFiltered, dateFilter]
  );

  const totalOrderQty = useMemo(() => filteredItems.reduce((s, i) => s + parseNum(i.orderQty), 0), [filteredItems]);
  const groupCount = useMemo(() => new Set(filteredItems.map(i => i.group).filter(Boolean)).size, [filteredItems]);

  const groups = ['All', ...new Set([...enrichedApproved, ...enrichedRejected].map(i => i.group).filter(Boolean))];

  const switchTab = (tab) => { setActiveTab(tab); setDateFilter(null); setSearch(''); };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const p = n => n.toString().padStart(2, '0');
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12; hours = hours ? hours : 12;
    // Unambiguous month-name format, e.g. "06 Jul 2026, 02:54 PM"
    return `${fmtDate(d)}, ${p(hours)}:${p(d.getMinutes())} ${ampm}`;
  };

  const kpis = [
    { label: isRejected ? 'Rejected Items' : 'Confirmed Items', value: filteredItems.length, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: isRejected ? 'Rejected Qty' : 'Total Order Qty', value: totalOrderQty, icon: ShoppingCart, color: isRejected ? 'text-red-600' : 'text-emerald-600', bg: isRejected ? 'bg-red-50' : 'bg-emerald-50' },
    { label: dateFilter ? 'Groups' : 'Order Dates', value: dateFilter ? groupCount : byDate.length, icon: dateFilter ? Layers : Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {isRejected ? <XCircle size={24} className="text-red-600" /> : <CheckCircle size={24} className="text-emerald-600" />}
          Order Status
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ShareOrderButton items={filteredItems} label="Share" />
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => switchTab('Approved')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Approved' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Approved ({enrichedApproved.length})
            </button>
            <button
              onClick={() => switchTab('Rejected')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Rejected' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Rejected ({enrichedRejected.length})
            </button>
          </div>
        </div>
      </div>

      {/* Business KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className="glass hover-lift p-3 sm:p-4 rounded-2xl flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${k.bg} ${k.color} shrink-0`}><k.icon size={22} /></div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-sm text-slate-500 font-medium truncate">{k.label}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + group filter */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search item or group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${showFilters || filterGroup !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={18} /> Filter
          </button>
        </div>
        {showFilters && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Group</label>
              <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="block w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <button onClick={() => { setFilterGroup('All'); setSearch(''); }} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">Reset</button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Date-wise summary (default) ===== */}
      {!dateFilter && (
        <div className="flex-1 glass-strong rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/40">
            <h3 className="font-bold text-slate-800">{isRejected ? 'Rejected' : 'Confirmed'} orders by date</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tap a date to see which items were {isRejected ? 'rejected' : 'confirmed'} and how much.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
            {byDate.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">No {activeTab.toLowerCase()} orders yet</div>
            )}
            {byDate.map(g => (
              <button
                key={g.date}
                onClick={() => setDateFilter(g.date)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl ${isRejected ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} shrink-0`}><Calendar size={20} /></div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{g.date}</p>
                    <p className="text-[11px] text-slate-500">
                      {g.items} item{g.items > 1 ? 's' : ''}
                      {g.confirmTs ? ` · ${isRejected ? 'Rejected' : 'Confirmed'} ${fmtDate(g.confirmTs)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] text-blue-500 uppercase font-bold">Total Qty</p>
                    <p className="text-lg font-black text-blue-600 leading-none">{g.qty}</p>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== Items for a selected date ===== */}
      {dateFilter && (
        <div className="flex-1 glass-strong rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-white/40 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setDateFilter(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"><ChevronLeft size={18} /></button>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><Calendar size={15} className="text-blue-600" /> {dateFilter}</h3>
                <p className="text-[11px] text-slate-500">{filteredItems.length} items · Total Qty {totalOrderQty}</p>
              </div>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.itemName}</h3>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{item.group}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-blue-500 uppercase font-bold">Order Qty</p>
                    <p className="text-2xl font-black text-blue-600 leading-none">{item.orderQty}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 uppercase font-bold">Shelf Qty</span><span className="text-xs font-bold text-slate-700">{item.shelf1}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 uppercase font-bold">MOQ</span><span className="text-xs font-bold text-slate-700">{item.moq}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 uppercase font-bold">Current Stock</span><span className="text-xs font-bold text-slate-700">{currentStock(item.qty)} <span className="text-[9px] text-slate-400">{item.unit}</span></span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 uppercase font-bold">Reorder Level</span><span className="text-xs font-bold text-slate-700">{item.roiQty}</span></div>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${isRejected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{activeTab}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(item.approvedAt || item.actual1)}</span>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <div className="py-12 text-center text-slate-400 text-sm">No items</div>}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3 w-24 text-right">Reorder Level</th>
                  <th className="px-4 py-3">Shelf Qty</th>
                  <th className="px-4 py-3 w-24 text-right">Current Stock</th>
                  <th className="px-4 py-3 w-24 text-right">Order Qty</th>
                  <th className="px-4 py-3 w-24 text-center">Status</th>
                  <th className="px-4 py-3 text-center w-40">{activeTab} On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{item.shelf1}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{currentStock(item.qty)}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-600">{item.orderQty}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${isRejected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{activeTab}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatDateTime(item.approvedAt || item.actual1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && <div className="py-12 text-center text-slate-400 text-sm italic">No items</div>}
          </div>

          <div className="border-t border-white/40 bg-white/40 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{filteredItems.length} item{filteredItems.length > 1 ? 's' : ''}</span>
            <span className="text-xs font-bold text-slate-700">Total Order Qty: <b className="text-blue-600 text-sm">{totalOrderQty}</b></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedPage;
