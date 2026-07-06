import React, { useState, useEffect, useMemo } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { currentStock, buildBackendMap, enrichItem } from '../utils/inventory';

const ApprovedPage = () => {
  const { items, backendItems, fetchBackendData } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Approved'); // 'Approved' | 'Rejected'

  useEffect(() => { fetchBackendData(); }, [fetchBackendData]);
  const backendMap = useMemo(() => buildBackendMap(backendItems), [backendItems]);
  const enrich = (item) => enrichItem(item, backendMap);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const approvedCount = items.filter(i => i.status === 'Approved' && enrich(i).orderQty > 0).length;
  const rejectedCount = items.filter(i => i.status === 'Rejected' && enrich(i).orderQty > 0).length;
  const isRejected = activeTab === 'Rejected';

  // Items for the active tab (Approved or Rejected); hide items with Order Qty = 0
  const shownItems = items.filter(i => i.status === activeTab && enrich(i).orderQty > 0);

  const filteredItems = shownItems.filter(i => {
    const matchesSearch = (i.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.item || '').toLowerCase().includes(search.toLowerCase()) ||
      i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGroup, activeTab]);

  const groups = ['All', ...new Set(items.map(item => item.group))];

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const p = n => n.toString().padStart(2, '0');
    const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear().toString().slice(-2)}`;
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const time = `${p(hours)}:${p(d.getMinutes())} ${ampm}`;
    return `${date} ${time}`;
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) tableContainer.scrollTop = 0;
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {isRejected ? <XCircle size={24} className="text-red-600" /> : <CheckCircle size={24} className="text-emerald-600" />}
          Order Status
        </h1>
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('Approved')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Approved' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('Rejected')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'Rejected' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Filters */}
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
            className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${showFilters || filterGroup !== 'All'
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Filter size={18} /> Filter
          </button>
        </div>

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
            <div className="flex items-end pb-0.5">
              <button
                onClick={() => { setFilterGroup('All'); setSearch(''); }}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 glass-strong rounded-2xl overflow-hidden flex flex-col">
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50">
          {paginatedItems.map((rawItem) => {
            const item = enrich(rawItem);
            return (
            <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              {/* Top: Item Name (left) + Order Qty (right) */}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.itemName}</h3>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">#{item.serialNo}</p>
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

              {/* Footer: status + upload date (blue glass pill) */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${isRejected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{activeTab}</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-300/40 backdrop-blur-sm shadow-sm">
                  {new Date(item.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            );
          })}
          {paginatedItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No {activeTab.toLowerCase()} items yet</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block flex-1 overflow-y-auto scrollbar-hide table-container">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-20 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3 w-24 text-right">Reorder Level</th>
                <th className="px-4 py-3">Shelf Qty</th>
                <th className="px-4 py-3 w-24 text-right">Current Stock</th>
                <th className="px-4 py-3 w-24 text-right">Order Qty</th>
                <th className="px-4 py-3 w-16 text-center">Unit</th>
                <th className="px-4 py-3 w-24 text-center">Status</th>
                <th className="px-4 py-3 text-center w-40">{activeTab} Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {paginatedItems.map((rawItem) => {
                const item = enrich(rawItem);
                return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{item.shelf1}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{currentStock(item.qty)}</td>
                  <td className="px-4 py-3 text-right font-black text-blue-600">{item.orderQty}</td>
                  <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{item.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${isRejected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{activeTab}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {formatDateTime(item.approvedAt || item.actual1)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {paginatedItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm italic">
              No {activeTab.toLowerCase()} items yet
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredItems.length > itemsPerPage && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Previous
              </button>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedPage;
