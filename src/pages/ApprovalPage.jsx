import React, { useState, useEffect, useMemo } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Check, X, Search, Filter, History, MousePointer2, SlidersHorizontal, Calendar, ChevronRight, ChevronLeft, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildBackendMap, enrichItem as enrichWithBackend, currentStock } from '../utils/inventory';
import ShareOrderButton from '../components/ShareOrderButton';
import FeedbackForm from '../components/FeedbackForm';

const ApprovalPage = () => {
  const { items, updateItemStatus, backendItems, fetchBackendData } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowEdits, setRowEdits] = useState({});
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  // Desktop column visibility (toggleable via the Columns dropdown) — hidden by default
  const [visibleCols, setVisibleCols] = useState({ group: false, item: false, moq: false, unit: false });
  const [showColMenu, setShowColMenu] = useState(false);
  // Party date-based confirm flow
  const [selectedDate, setSelectedDate] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Load Backend master sheet so we can map Item Code / Group / MOQ + Order Qty
  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);
  const backendMap = useMemo(() => buildBackendMap(backendItems), [backendItems]);
  const enrichItem = (item) => enrichWithBackend(item, backendMap);

  // Only items that need ordering (Order Qty > 0) are shown — tab counts match too
  const pendingItems = items.filter(i => i.planned1 && !i.actual1 && enrichItem(i).orderQty > 0);
  const historyItems = items.filter(i => i.planned1 && i.actual1 && enrichItem(i).orderQty > 0);
  const displayItems = activeTab === 'Pending' ? pendingItems : historyItems;

  const filteredItems = displayItems.filter(i => {
    const matchesSearch = (i.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.item || '').toLowerCase().includes(search.toLowerCase()) ||
      i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    const matchesStatus = filterStatus === 'All' || i.status === filterStatus;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  // No pagination — show all items (the table scrolls)
  const paginatedItems = filteredItems;


  const groups = ['All', ...new Set(items.map(item => item.group))];
  const statuses = ['All', 'Waiting for Approval', 'Approved', 'Rejected'];

  const handleRowEdit = (id, field, value) => {
    setRowEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };

  // Build the extra data saved on approve/reject. Current Stock is NOT editable;
  // only Order Qty can be overridden (saved as orderQtyManual so it persists).
  const buildExtra = (id, status) => {
    const edit = rowEdits[id] || {};
    const item = items.find(i => i.id === id);
    const enriched = enrichItem(item);
    // Final Order Qty = edited value if any, else the auto-calculated one.
    // Saved as orderQtyManual so it persists and gets written to the sheet (column N).
    const orderQty = (edit.orderQty !== undefined && edit.orderQty !== '') ? edit.orderQty : enriched.orderQty;
    return {
      remark: edit.remark ?? item.remark ?? '',
      approvedAt: status === 'Approved' ? new Date().toISOString() : null,
      orderQtyManual: orderQty
    };
  };

  const handleAction = (id, status) => {
    if (!status) return;
    updateItemStatus(id, status, buildExtra(id, status));
    setRowEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[id];
      return newEdits;
    });
    toast.success(`Item ${status}`);
  };

  const handleBulkSubmit = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => {
      const status = (rowEdits[id] || {}).status || 'Approved';
      updateItemStatus(id, status, buildExtra(id, status));
    });
    setRowEdits({});
    setSelectedIds([]);
    toast.success(`Successfully submitted ${selectedIds.length} items`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(i => i.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ===== Party date-based confirm flow =====
  const fmtDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'Unknown date' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Group pending items by their upload date (most recent first)
  const pendingByDate = (() => {
    const map = new Map();
    pendingItems.forEach(i => {
      const key = fmtDate(i.uploadedAt);
      if (!map.has(key)) map.set(key, { date: key, ts: new Date(i.uploadedAt).getTime() || 0, items: [] });
      map.get(key).items.push(i);
    });
    return [...map.values()].sort((a, b) => b.ts - a.ts);
  })();

  const dateItems = selectedDate ? pendingItems.filter(i => fmtDate(i.uploadedAt) === selectedDate) : [];
  // Search-filtered view of the date's items (search does not affect selection)
  const shownDateItems = dateItems.filter(i =>
    !search ||
    (i.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.group || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.item || '').toLowerCase().includes(search.toLowerCase()) ||
    String(i.serialNo || '').toLowerCase().includes(search.toLowerCase())
  );

  const openDate = (date) => {
    setSearch('');
    setSelectedDate(date);
    // select all of that date's items by default
    setSelectedIds(pendingItems.filter(i => fmtDate(i.uploadedAt) === date).map(i => i.id));
  };

  const resetFlow = () => { setSubmitted(false); setSelectedDate(null); setSelectedIds([]); setRowEdits({}); setSearch(''); };

  const submitOrder = () => {
    if (selectedIds.length === 0) { toast.error('Please select at least one item'); return; }
    const count = selectedIds.length;
    selectedIds.forEach(id => updateItemStatus(id, 'Approved', buildExtra(id, 'Approved')));
    setSubmitCount(count);
    setSelectedIds([]);
    setRowEdits({});
    setSubmitted(true);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Confirm order</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {(activeTab === 'History' || selectedDate) && (
            <ShareOrderButton items={(activeTab === 'Pending' && selectedDate ? dateItems : filteredItems).map(enrichItem)} label="Share" />
          )}
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => { setActiveTab('Pending'); resetFlow(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Pending' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              onClick={() => { setActiveTab('History'); resetFlow(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'History' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* ===== Pending: party date-based confirm flow ===== */}
      {activeTab === 'Pending' && submitted && (
        <div className="flex-1 glass-strong rounded-2xl overflow-y-auto flex flex-col items-center text-center p-8 gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-300">
            <Check size={44} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-2">Thank You! <PartyPopper className="text-amber-500" size={28} /></h2>
          <p className="text-slate-500 max-w-md">
            Your order has been confirmed successfully. We've received <b className="text-emerald-600">{submitCount} item{submitCount > 1 ? 's' : ''}</b> and our team will process your dispatch shortly. 🙏
          </p>

          {/* Rate your experience — feedback captured right after confirming */}
          <div className="w-full max-w-md mt-2 pt-5 border-t border-slate-200/70">
            <p className="text-lg font-bold text-slate-800 mb-3">How was your experience?</p>
            <FeedbackForm source="Order Confirm" compact />
          </div>

          <button onClick={resetFlow} className="mt-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all">
            Back to Dates
          </button>
        </div>
      )}

      {activeTab === 'Pending' && !submitted && !selectedDate && (
        <div className="flex-1 glass-strong rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/40">
            <h3 className="font-bold text-slate-800">Select an upload date to confirm</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tap a date to review and submit that day's order.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
            {pendingByDate.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">No pending orders to confirm right now 🎉</div>
            )}
            {pendingByDate.map(g => (
              <button
                key={g.date}
                onClick={() => openDate(g.date)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Calendar size={20} /></div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{g.date}</p>
                    <p className="text-[11px] text-slate-500">{g.items.length} item{g.items.length > 1 ? 's' : ''} to confirm</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Pending' && !submitted && selectedDate && (
        <div className="flex-1 glass-strong rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-white/40 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => { setSelectedDate(null); setSelectedIds([]); setSearch(''); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 shrink-0"><ChevronLeft size={18} /></button>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><Calendar size={15} className="text-blue-600" /> {selectedDate}</h3>
                <p className="text-[11px] text-slate-500">{selectedIds.length} of {dateItems.length} selected</p>
              </div>
            </div>
            <button
              onClick={submitOrder}
              disabled={selectedIds.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} /> Submit Order ({selectedIds.length})
            </button>
          </div>
          {/* Search */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item or group..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>
          <label className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-white/40 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === dateItems.length && dateItems.length > 0}
              onChange={() => setSelectedIds(selectedIds.length === dateItems.length ? [] : dateItems.map(i => i.id))}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-slate-700">Select All ({dateItems.length})</span>
          </label>

          {/* Mobile: cards */}
          <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide bg-slate-50/50">
            {shownDateItems.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">No items match your search</div>
            )}
            {shownDateItems.map(rawItem => {
              const item = enrichItem(rawItem);
              const sel = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`bg-white p-3 rounded-xl border shadow-sm cursor-pointer transition-all flex flex-col gap-2 ${sel ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}
                >
                  {/* Top: checkbox + name + Order Qty */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.itemName}</h3>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{item.group}</p>
                    </div>
                    <div className="text-right shrink-0" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[9px] text-blue-500 uppercase font-bold">Order Qty</p>
                      <input
                        type="number"
                        value={rowEdits[item.id]?.orderQty ?? item.orderQty}
                        onChange={(e) => handleRowEdit(item.id, 'orderQty', e.target.value)}
                        className="w-20 px-2 py-1 border border-blue-200 rounded-lg font-black text-blue-600 text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-slate-50 rounded-lg p-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Reorder Level</span>
                      <span className="text-xs font-bold text-slate-700">{item.roiQty}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Shelf Qty</span>
                      <span className="text-xs font-bold text-slate-700">{item.shelf1}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">MOQ</span>
                      <span className="text-xs font-bold text-slate-700">{item.moq}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Current Stock</span>
                      <span className="text-xs font-bold text-slate-700">{currentStock(item.qty)} <span className="text-[9px] text-slate-400">{item.unit}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === dateItems.length && dateItems.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === dateItems.length ? [] : dateItems.map(i => i.id))}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3 w-28 text-right">Reorder Level</th>
                  <th className="px-4 py-3 w-24 text-right">Shelf Qty</th>
                  <th className="px-4 py-3 w-20 text-right">MOQ</th>
                  <th className="px-4 py-3 w-28 text-right">Current Stock</th>
                  <th className="px-4 py-3 w-28 text-right">Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px]">
                {shownDateItems.length === 0 && (
                  <tr><td colSpan="8" className="py-12 text-center text-slate-400 text-sm italic">No items match your search</td></tr>
                )}
                {shownDateItems.map(rawItem => {
                  const item = enrichItem(rawItem);
                  const sel = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} onClick={() => toggleSelect(item.id)} className={`${sel ? 'bg-emerald-50/40' : 'hover:bg-slate-50/50'} transition-colors cursor-pointer`}>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-600">{item.shelf1}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-600">{item.moq}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{currentStock(item.qty)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          value={rowEdits[item.id]?.orderQty ?? item.orderQty}
                          onChange={(e) => handleRowEdit(item.id, 'orderQty', e.target.value)}
                          className="w-16 px-2 py-1 border border-blue-300 rounded font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'History' && (
      <>
      {/* Filters & Bulk Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search items, codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${showFilters || filterGroup !== 'All' || filterStatus !== 'All'
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Filter size={18} /> Filter
          </button>

          {/* Columns visibility (desktop) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="px-4 py-2 border border-slate-200 rounded-xl flex items-center gap-2 transition-all shadow-sm bg-white text-slate-600 hover:bg-slate-50"
            >
              <SlidersHorizontal size={18} /> Columns
            </button>
            {showColMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-30 animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Show columns</p>
                {[['group', 'Group'], ['item', 'Item Code'], ['moq', 'MOQ'], ['unit', 'Unit']].map(([key, lbl]) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleCols[key]}
                      onChange={() => setVisibleCols(v => ({ ...v, [key]: !v[key] }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-700">{lbl}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Group</label>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="block w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <button
                onClick={() => {
                  setFilterGroup('All');
                  setFilterStatus('All');
                  setSearch('');
                }}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 p-2 px-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-700">{selectedIds.length} items selected</span>
              <div className="h-4 w-px bg-blue-200" />
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkSubmit}
                className="px-6 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-colors uppercase tracking-wider"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Container with pagination */}
      <div className="flex-1 glass-strong rounded-2xl overflow-hidden flex flex-col">
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50">
          {activeTab === 'Pending' && paginatedItems.length > 0 && (
            <label className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">Select All ({paginatedItems.length})</span>
              </div>
              {selectedIds.length > 0 && (
                <span className="text-[10px] font-bold text-blue-600">{selectedIds.length} selected</span>
              )}
            </label>
          )}
          {paginatedItems.map((rawItem) => {
            const item = enrichItem(rawItem);
            return (
            <div
              key={item.id}
              onClick={() => activeTab === 'Pending' && toggleSelect(item.id)}
              className={`bg-white p-3 rounded-xl border shadow-sm flex flex-col gap-3 transition-all ${selectedIds.includes(item.id) ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'}`}
            >
              {/* Top: Item Name (left) + Order Qty (right) */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-2 min-w-0">
                  {activeTab === 'Pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.itemName}</h3>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">#{item.serialNo}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-blue-500 uppercase font-bold">Order Qty</p>
                  <p className="text-2xl font-black text-blue-600 leading-none">{item.orderQty}</p>
                </div>
              </div>

              {/* Details grid: Shelf Qty, MOQ, Current Stock, Reorder Level */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Shelf Qty</span>
                  <span className="text-xs font-bold text-slate-700">{item.shelf1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">MOQ</span>
                  <span className="text-xs font-bold text-slate-700">{item.moq}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Current Stock</span>
                  <span className="text-xs font-bold text-slate-700">{currentStock(item.qty)} <span className="text-[9px] text-slate-400">{item.unit}</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Reorder Level</span>
                  <span className="text-xs font-bold text-slate-700">{item.roiQty}</span>
                </div>
              </div>

              {/* Pending: edit controls when selected, else a tap hint */}
              {activeTab === 'Pending' && (selectedIds.includes(item.id) ? (
                <div className="grid grid-cols-2 gap-2 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Order Qty</label>
                    <input
                      type="number"
                      value={rowEdits[item.id]?.orderQty ?? item.orderQty}
                      onChange={(e) => handleRowEdit(item.id, 'orderQty', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg font-black text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Action</label>
                    <div className="flex gap-1">
                      <select
                        value={rowEdits[item.id]?.status ?? 'Approved'}
                        onChange={(e) => handleRowEdit(item.id, 'status', e.target.value)}
                        className={`flex-1 px-2 py-1.5 text-xs border rounded-lg font-bold ${(rowEdits[item.id]?.status ?? 'Approved') === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                      >
                        <option value="Approved">Accept</option>
                        <option value="Rejected">Reject</option>
                      </select>
                      <button
                        onClick={() => handleAction(item.id, rowEdits[item.id]?.status ?? 'Approved')}
                        className={`p-2 text-white rounded-lg ${(rowEdits[item.id]?.status ?? 'Approved') === 'Approved' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center gap-2 bg-slate-50 py-2 rounded-lg border border-dashed border-slate-200">
                  <MousePointer2 size={12} className="text-slate-300" />
                  <span className="text-[10px] text-slate-500 font-medium italic">Tap to edit &amp; confirm</span>
                </div>
              ))}

              {/* Footer: status (History) + upload date (blue glass pill) */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                {activeTab === 'History' ? (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : item.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.status === 'Waiting for Approval' ? 'Pending' : item.status}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Uploaded</span>
                )}
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-300/40 backdrop-blur-sm shadow-sm">
                  {fmtDate(item.uploadedAt)}
                </span>
              </div>
            </div>
            );
          })}
          {paginatedItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No items found</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block flex-1 overflow-y-auto scrollbar-hide table-container">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-20 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  {activeTab === 'Pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                {activeTab === 'Pending' && <th className="px-4 py-3 w-40 text-center">Action</th>}
                <th className="px-4 py-3">Item Name</th>
                {visibleCols.group && <th className="px-4 py-3">Group</th>}
                {visibleCols.item && <th className="px-4 py-3">Item Code</th>}
                <th className="px-4 py-3 w-24 text-right">Reorder Level</th>
                <th className="px-4 py-3">Shelf Qty</th>
                <th className="px-4 py-3 w-24 text-right">Current Stock</th>
                {visibleCols.moq && <th className="px-4 py-3 w-20 text-right">MOQ</th>}
                <th className="px-4 py-3 w-24 text-right">Order Qty</th>
                {visibleCols.unit && <th className="px-4 py-3 w-16 text-center">Unit</th>}
                {activeTab === 'History' && <th className="px-4 py-3 text-center w-32">Date</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {paginatedItems.map((rawItem) => {
                const item = enrichItem(rawItem);
                return (
                <tr key={item.id} className={`${selectedIds.includes(item.id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-colors cursor-pointer`} onClick={() => activeTab === 'Pending' && toggleSelect(item.id)}>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'Pending' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                    {activeTab === 'History' && <div className="w-4" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>

                  {activeTab === 'Pending' && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {selectedIds.includes(item.id) ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={rowEdits[item.id]?.status ?? 'Approved'}
                            onChange={(e) => handleRowEdit(item.id, 'status', e.target.value)}
                            className={`flex-1 px-2 py-1.5 border rounded-lg font-bold shadow-sm focus:ring-2 outline-none transition-all cursor-pointer ${(rowEdits[item.id]?.status ?? 'Approved') === 'Approved'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-emerald-500'
                                : 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500'
                              }`}
                          >
                            <option value="Approved" className="bg-white text-emerald-700 font-bold">Accept</option>
                            <option value="Rejected" className="bg-white text-red-700 font-bold">Reject</option>
                          </select>
                          <button
                            onClick={() => handleAction(item.id, rowEdits[item.id]?.status ?? 'Approved')}
                            className={`p-1.5 text-white rounded-lg transition-all shadow-sm ${(rowEdits[item.id]?.status ?? 'Approved') === 'Approved'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                                : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                              }`}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <span className="text-[10px] text-slate-400 italic">Select to edit</span>
                        </div>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                  {visibleCols.group && <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>}
                  {visibleCols.item && <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>}
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{item.shelf1}</td>

                  <td className="px-4 py-3 text-right font-bold text-slate-800">{currentStock(item.qty)}</td>
                  {visibleCols.moq && <td className="px-4 py-3 text-right font-bold text-slate-600">{item.moq}</td>}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'Pending' && selectedIds.includes(item.id) ? (
                      <input
                        type="number"
                        value={rowEdits[item.id]?.orderQty ?? item.orderQty}
                        onChange={(e) => handleRowEdit(item.id, 'orderQty', e.target.value)}
                        className="w-16 px-2 py-1 border border-blue-300 rounded font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                      />
                    ) : (
                      <span className="font-black text-blue-600">{item.orderQty}</span>
                    )}
                  </td>
                  {visibleCols.unit && (
                    <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">
                      {item.unit}
                    </td>
                  )}

                  {activeTab === 'History' && (
                    <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium">
                      {fmtDate(item.approvedAt || item.uploadedAt)}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
          {paginatedItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm italic">
              No items found in {activeTab.toLowerCase()} list
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default ApprovalPage;