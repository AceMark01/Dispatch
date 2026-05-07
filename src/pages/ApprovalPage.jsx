import React, { useState } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Check, X, Search, Filter, History, MousePointer2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ApprovalPage = () => {
  const { items, updateItemStatus } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowEdits, setRowEdits] = useState({});
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const pendingItems = items.filter(i => i.status === 'Waiting for Approval');
  const historyItems = items.filter(i => i.status !== 'Waiting for Approval');
  const displayItems = activeTab === 'Pending' ? pendingItems : historyItems;
  
  const filteredItems = displayItems.filter(i => {
    const matchesSearch = i.itemDetails.toLowerCase().includes(search.toLowerCase()) ||
                         i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
                         i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    const matchesStatus = filterStatus === 'All' || i.status === filterStatus;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const groups = ['All', ...new Set(items.map(item => item.group))];
  const statuses = ['All', 'Waiting for Approval', 'Approved', 'Rejected'];

  const handleRowEdit = (id, field, value) => {
    setRowEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };

  const handleAction = (id, status) => {
    if (!status) return;
    const edit = rowEdits[id] || {};
    const item = items.find(i => i.id === id);
    updateItemStatus(id, status, { 
      qty: edit.qty ?? item.qty,
      remark: edit.remark ?? item.remark ?? '',
      approvedAt: status === 'Approved' ? new Date().toISOString() : null 
    });
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
      const edit = rowEdits[id] || {};
      const item = items.find(i => i.id === id);
      const status = edit.status || 'Approved';
      updateItemStatus(id, status, { 
        qty: edit.qty ?? item.qty,
        remark: edit.remark ?? item.remark ?? '',
        approvedAt: status === 'Approved' ? new Date().toISOString() : null 
      });
    });
    setRowEdits({});
    setSelectedIds([]);
    toast.success(`Successfully submitted ${selectedIds.length} items`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Ace-Mark Approval</h1>
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
            className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${
              showFilters || filterGroup !== 'All' || filterStatus !== 'All'
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

      {/* Table Container */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  {activeTab === 'Pending' && (
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.itemCode}</span>
                    <h3 className="font-bold text-slate-800 text-sm">{item.itemDetails}</h3>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                  item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {item.status}
                </span>
              </div>
              
              {activeTab === 'Pending' && selectedIds.includes(item.id) ? (
                <div className="grid grid-cols-2 gap-3 mt-1 animate-in zoom-in-95">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Qty</label>
                    <input 
                      type="number"
                      value={rowEdits[item.id]?.qty ?? item.qty}
                      onChange={(e) => handleRowEdit(item.id, 'qty', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Action</label>
                    <div className="flex gap-1">
                      <select 
                        value={rowEdits[item.id]?.status ?? 'Approved'}
                        onChange={(e) => handleRowEdit(item.id, 'status', e.target.value)}
                        className={`flex-1 px-2 py-1 text-xs border rounded font-bold transition-all ${
                          (rowEdits[item.id]?.status ?? 'Approved') === 'Approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        <option value="Approved">Accept</option>
                        <option value="Rejected">Reject</option>
                      </select>
                      <button 
                        onClick={() => handleAction(item.id, rowEdits[item.id]?.status ?? 'Approved')}
                        className={`p-1 text-white rounded transition-all ${
                          (rowEdits[item.id]?.status ?? 'Approved') === 'Approved'
                            ? 'bg-emerald-600'
                            : 'bg-red-600'
                        }`}
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Remark</label>
                    <input 
                      type="text"
                      placeholder="Add remark..."
                      value={rowEdits[item.id]?.remark ?? item.remark ?? ''}
                      onChange={(e) => handleRowEdit(item.id, 'remark', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              ) : activeTab === 'Pending' && (
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg mt-1 border border-dashed border-slate-200">
                  <span className="text-[10px] text-slate-500 font-medium italic">Select row to edit details</span>
                  <MousePointer2 size={12} className="text-slate-300" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-100 mt-1">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Group</p>
                  <p className="text-xs font-semibold text-slate-600">{item.group}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold">SN</p>
                  <p className="text-xs font-medium text-slate-500">#{item.serialNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Original Qty</p>
                  <p className="text-xs font-bold text-slate-800">{item.qty} {item.unit}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No items found</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-20 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  {activeTab === 'Pending' && (
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                {activeTab === 'Pending' && <th className="px-4 py-3 w-40 text-center">Action</th>}
                <th className="px-4 py-3 w-48">Remark</th>
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3 w-24 text-right">Qty</th>
                <th className="px-4 py-3 text-center w-24">Status</th>
                {activeTab === 'History' && <th className="px-4 py-3 text-center w-32">Date</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {filteredItems.map((item) => (
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
                            className={`flex-1 px-2 py-1.5 border rounded-lg font-bold shadow-sm focus:ring-2 outline-none transition-all cursor-pointer ${
                              (rowEdits[item.id]?.status ?? 'Approved') === 'Approved'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-emerald-500'
                                : 'bg-red-50 border-red-200 text-red-700 focus:ring-red-500'
                            }`}
                          >
                            <option value="Approved" className="bg-white text-emerald-700 font-bold">Accept</option>
                            <option value="Rejected" className="bg-white text-red-700 font-bold">Reject</option>
                          </select>
                          <button 
                            onClick={() => handleAction(item.id, rowEdits[item.id]?.status ?? 'Approved')}
                            className={`p-1.5 text-white rounded-lg transition-all shadow-sm ${
                              (rowEdits[item.id]?.status ?? 'Approved') === 'Approved'
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

                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'Pending' && selectedIds.includes(item.id) ? (
                      <input 
                        type="text"
                        placeholder="Remark..."
                        value={rowEdits[item.id]?.remark ?? item.remark ?? ''}
                        onChange={(e) => handleRowEdit(item.id, 'remark', e.target.value)}
                        className="w-full px-3 py-1 border border-slate-200 rounded text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <span className="text-slate-500 italic truncate max-w-[150px] block">{item.remark || '-'}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{item.itemDetails}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">{item.itemCode}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{item.group}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {activeTab === 'Pending' && selectedIds.includes(item.id) ? (
                      <div className="flex items-center justify-end gap-1">
                        <input 
                          type="number"
                          value={rowEdits[item.id]?.qty ?? item.qty}
                          onChange={(e) => handleRowEdit(item.id, 'qty', e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                        />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{item.unit}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-800">{item.qty} {item.unit}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 shadow-sm' :
                      item.status === 'Rejected' ? 'bg-red-100 text-red-700 shadow-sm' :
                      'bg-amber-100 text-amber-700 shadow-sm'
                    }`}>
                      {item.status === 'Waiting for Approval' ? 'Pending' : item.status}
                    </span>
                  </td>

                  {activeTab === 'History' && (
                    <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium">
                      {new Date(item.approvedAt || item.uploadedAt).toLocaleString()}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm italic">
              No items found in {activeTab.toLowerCase()} list
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalPage;

