import React, { useState, useEffect, useMemo } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Check, X, Search, Filter, History, MousePointer2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildBackendMap, enrichItem as enrichWithBackend, currentStock } from '../utils/inventory';

const ApprovalPage = () => {
  const { items, updateItemStatus, backendItems, fetchBackendData } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowEdits, setRowEdits] = useState({});
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load Backend master sheet so we can map Item Code / Group / MOQ + Order Qty
  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);
  const backendMap = useMemo(() => buildBackendMap(backendItems), [backendItems]);
  const enrichItem = (item) => enrichWithBackend(item, backendMap);

  const pendingItems = items.filter(i => i.planned1 && !i.actual1);
  const historyItems = items.filter(i => i.planned1 && i.actual1);
  const displayItems = activeTab === 'Pending' ? pendingItems : historyItems;

  const filteredItems = displayItems.filter(i => {
    const matchesSearch = (i.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.item || '').toLowerCase().includes(search.toLowerCase()) ||
      i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    const matchesStatus = filterStatus === 'All' || i.status === filterStatus;
    // Hide items that don't need ordering (Order Qty = 0)
    return matchesSearch && matchesGroup && matchesStatus && enrichItem(i).orderQty > 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGroup, filterStatus, activeTab]);

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

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    // Scroll to top of table
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Confirm order</h1>
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => { setActiveTab('Pending'); setSelectedIds([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Pending' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Pending ({pendingItems.length})
          </button>
          <button
            onClick={() => { setActiveTab('History'); setSelectedIds([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'History' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            History
          </button>
        </div>
      </div>

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
                className="px-6 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors uppercase tracking-wider"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Container with pagination */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
                        className={`p-2 text-white rounded-lg ${(rowEdits[item.id]?.status ?? 'Approved') === 'Approved' ? 'bg-emerald-600' : 'bg-red-600'}`}
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
                  {new Date(item.uploadedAt).toLocaleDateString()}
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
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3 w-24 text-right">Reorder Level</th>
                <th className="px-4 py-3">Shelf Qty</th>
                <th className="px-4 py-3 w-24 text-right">Current Stock</th>
                <th className="px-4 py-3 w-20 text-right">MOQ</th>
                <th className="px-4 py-3 w-24 text-right">Order Qty</th>
                <th className="px-4 py-3 w-16 text-center">Unit</th>
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
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
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
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{item.shelf1}</td>

                  <td className="px-4 py-3 text-right font-bold text-slate-800">{currentStock(item.qty)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-600">{item.moq}</td>
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
                  <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">
                    {item.unit}
                  </td>

                  {activeTab === 'History' && (
                    <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium">
                      {new Date(item.approvedAt || item.uploadedAt).toLocaleDateString()}
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

        {/* Pagination Component */}
        {filteredItems.length > itemsPerPage && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${currentPage === 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <div className="flex gap-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }

                  return pages.map(page => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === page
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${currentPage === totalPages
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalPage;