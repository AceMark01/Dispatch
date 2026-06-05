import React, { useState, useEffect } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Truck, Search, Filter, History, CheckSquare, MousePointer2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// Dispatch Module - Handles confirmed orders and partial dispatching
const DispatchPage = () => {
  const { items, partialDispatch, bulkUpdateStatus, fetchFromSheet } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowEdits, setRowEdits] = useState({});
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const pendingItems = items.filter(i => i.planned3 && Number(i.pendingQty) > 0);
  const historyItems = items.filter(i => i.planned3 && Number(i.pendingQty) <= 0);

  const displayItems = activeTab === 'Pending' ? pendingItems : historyItems;

  const filteredItems = displayItems.filter(i => {
    const matchesSearch = (i.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.item || '').toLowerCase().includes(search.toLowerCase()) ||
      i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGroup, activeTab]);

  const groups = ['All', ...new Set(items.map(item => item.group))];

  const handleRowEdit = (id, field, value) => {
    setRowEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };

  const handleSingleDispatch = (id) => {
    const edit = rowEdits[id] || {};
    const item = items.find(i => i.id === id);
    const dQty = edit.dispatchQty ?? item.qty;

    if (Number(dQty) > Number(item.qty)) {
      toast.error('Dispatch quantity cannot exceed confirmed quantity');
      return;
    }

    partialDispatch(id, dQty, edit.remark);
    setRowEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[id];
      return newEdits;
    });
    toast.success(`Dispatched ${dQty} items`);
    setActiveTab('History');
  };

  const handleBulkDispatch = () => {
    if (selectedIds.length === 0) return;

    let errorOccurred = false;
    selectedIds.forEach(id => {
      const edit = rowEdits[id] || {};
      const item = items.find(i => i.id === id);
      const dQty = edit.dispatchQty ?? item.qty;

      if (Number(dQty) > Number(item.qty)) {
        errorOccurred = true;
        return;
      }

      partialDispatch(id, dQty, edit.remark);
    });

    if (errorOccurred) {
      toast.error('Some items were skipped because dispatch quantity exceeded confirmed quantity');
    }

    setRowEdits({});
    setSelectedIds([]);
    toast.success(`Processed ${selectedIds.length} items`);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(i => i.id));
    }
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
        <h1 className="text-2xl font-bold text-slate-800">Dispatch Hub</h1>
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => { setActiveTab('Pending'); setSelectedIds([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Pending' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Confirmed ({pendingItems.length})
          </button>
          <button
            onClick={() => { setActiveTab('History'); setSelectedIds([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'History' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            History
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search items for dispatch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${showFilters || filterGroup !== 'All'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
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
                className="block w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              >
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <button
                onClick={() => {
                  setFilterGroup('All');
                  setSearch('');
                }}
                className="px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 p-2 px-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-emerald-700">{selectedIds.length} items selected</span>
              <div className="h-4 w-px bg-emerald-200" />
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDispatch}
                className="px-6 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors uppercase tracking-wider flex items-center gap-2"
              >
                <Truck size={14} /> Submit Dispatch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50">
          {paginatedItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white p-3 rounded-lg border transition-all ${selectedIds.includes(item.id) ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-lg' : 'border-slate-200 shadow-sm'}`}
              onClick={() => activeTab === 'Pending' && toggleSelect(item.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {activeTab === 'Pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      readOnly
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.item}</span>
                    <h3 className="font-bold text-slate-800 text-sm">{item.itemName}</h3>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Ordered Qty</span>
                  <span className="font-bold">{item.qty} <span className="text-[10px] font-bold text-slate-500 uppercase ml-0.5">{item.unit}</span></span>
                </div>
                {activeTab === 'Pending' && selectedIds.includes(item.id) && (
                  <div className="flex-1 max-w-[80px]">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Dispatch Qty</span>
                    <input
                      type="number"
                      value={rowEdits[item.id]?.dispatchQty ?? item.qty}
                      onChange={(e) => { e.stopPropagation(); handleRowEdit(item.id, 'dispatchQty', e.target.value); }}
                      className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-bold text-emerald-700"
                    />
                  </div>
                )}
                {activeTab === 'Pending' && selectedIds.includes(item.id) && (
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Remaining</span>
                    <span className={`font-bold ${Number(item.qty) - Number(rowEdits[item.id]?.dispatchQty ?? item.qty) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {Number(item.qty) - Number(rowEdits[item.id]?.dispatchQty ?? item.qty)}
                    </span>
                  </div>
                )}
                {activeTab === 'Pending' && selectedIds.includes(item.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSingleDispatch(item.id); }}
                    className="p-2 bg-emerald-600 text-white rounded shadow-sm self-end"
                  >
                    <Truck size={14} />
                  </button>
                )}
              </div>

              {activeTab === 'Pending' && selectedIds.includes(item.id) && (
                <div className="mb-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Dispatch Remark</label>
                  <input
                    type="text"
                    placeholder="Enter remark..."
                    value={rowEdits[item.id]?.remark ?? ''}
                    onChange={(e) => { e.stopPropagation(); handleRowEdit(item.id, 'remark', e.target.value); }}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              )}

              {activeTab === 'Pending' && !selectedIds.includes(item.id) && (
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg mt-1 border border-dashed border-slate-200 animate-in fade-in">
                  <span className="text-[10px] text-slate-500 font-medium italic">Select to dispatch</span>
                  <MousePointer2 size={12} className="text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {paginatedItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No items found</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block flex-1 overflow-y-auto scrollbar-hide table-container">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-20 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  {activeTab === 'Pending' && paginatedItems.length > 0 && (
                    <input
                      type="checkbox"
                      checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  )}
                </th>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3 w-24 text-right">Ordered Qty</th>
                {activeTab === 'Pending' && <th className="px-4 py-3 w-24 text-right">Remaining Qty</th>}
                <th className="px-4 py-3 w-16 text-center">Unit</th>
                <th className="px-4 py-3 w-48">Remark</th>
                <th className="px-4 py-3 w-32 text-right">{activeTab === 'Pending' ? 'Dispatch Qty' : 'Dispatched Qty'}</th>
                {activeTab === 'History' && <th className="px-4 py-3 text-center w-32">Date</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {paginatedItems.map((item) => {
                const currentDisp = rowEdits[item.id]?.dispatchQty ?? item.qty;
                const remaining = Number(item.qty) - Number(currentDisp);

                return (
                  <tr
                    key={item.id}
                    className={`${selectedIds.includes(item.id) ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'} transition-colors cursor-pointer`}
                    onClick={() => activeTab === 'Pending' && toggleSelect(item.id)}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {activeTab === 'Pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      )}
                      {activeTab === 'History' && <div className="w-4" />}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>

                    <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>

                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {item.qty}
                    </td>

                    {activeTab === 'Pending' && (
                      <td className="px-4 py-3 text-right">
                        {selectedIds.includes(item.id) ? (
                          <span className={`font-bold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {remaining}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">{item.qty}</span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">
                      {item.unit}
                    </td>

                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {activeTab === 'Pending' && selectedIds.includes(item.id) ? (
                        <input
                          type="text"
                          placeholder="Remark..."
                          value={rowEdits[item.id]?.remark ?? item.remark ?? ''}
                          onChange={(e) => handleRowEdit(item.id, 'remark', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px] truncate max-w-[150px] block">{item.remark || '-'}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {activeTab === 'Pending' && selectedIds.includes(item.id) ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={currentDisp}
                            max={item.qty}
                            onChange={(e) => handleRowEdit(item.id, 'dispatchQty', e.target.value)}
                            className="w-20 px-2 py-1 border border-emerald-200 rounded font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                          />
                          <button
                            onClick={() => handleSingleDispatch(item.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                          >
                            <Truck size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-800">{activeTab === 'History' ? item.qty : '-'}</span>
                      )}
                    </td>

                    {activeTab === 'History' && (
                      <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium">
                        {new Date(item.dispatchedAt || item.uploadedAt).toLocaleDateString()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {paginatedItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No items found</div>
          )}
        </div>

        {/* Pagination Component */}
        {filteredItems.length > itemsPerPage && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between flex-wrap gap-3">
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
                        ? 'bg-emerald-600 text-white shadow-sm'
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

export default DispatchPage;