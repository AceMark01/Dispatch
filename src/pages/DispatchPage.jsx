import React, { useState } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import { Truck, Search, Filter, History, CheckSquare, MousePointer2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Dispatch Module - Handles confirmed orders and partial dispatching
const DispatchPage = () => {
  const { items, partialDispatch, bulkUpdateStatus } = useDispatchStore();
  const [activeTab, setActiveTab] = useState('Pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [rowEdits, setRowEdits] = useState({});
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const pendingItems = items.filter(i => i.status === 'Confirmed');
  const historyItems = items.filter(i => i.status === 'Dispatched');

  const displayItems = activeTab === 'Pending' ? pendingItems : historyItems;
  
  const filteredItems = displayItems.filter(i => {
    const matchesSearch = i.itemDetails.toLowerCase().includes(search.toLowerCase()) ||
                         i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
                         i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

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
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(i => i.id));
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
            className={`px-4 py-2 border rounded-xl flex items-center gap-2 transition-all shadow-sm ${
              showFilters || filterGroup !== 'All'
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
          {filteredItems.map((item) => (
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.itemCode}</span>
                    <h3 className="font-bold text-slate-800 text-sm">{item.itemDetails}</h3>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                  item.status === 'Dispatched' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Conf. Qty</span>
                  <span className="font-bold">{item.qty} {item.unit}</span>
                </div>
                {activeTab === 'Pending' && selectedIds.includes(item.id) && (
                  <div className="flex-1 max-w-[100px]">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Disp. Qty</span>
                    <input 
                      type="number"
                      value={rowEdits[item.id]?.dispatchQty ?? item.qty}
                      onChange={(e) => { e.stopPropagation(); handleRowEdit(item.id, 'dispatchQty', e.target.value); }}
                      className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-bold text-emerald-700"
                    />
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
        </div>

        {/* Desktop View */}
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
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  )}
                </th>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3 w-48">Remark</th>
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3 w-32 text-right">{activeTab === 'Pending' ? 'Disp. Qty' : 'Qty'}</th>
                {activeTab === 'Pending' && <th className="px-4 py-3 w-32 text-right">Remaining</th>}
                <th className="px-4 py-3 text-center w-24">Status</th>
                {activeTab === 'History' && <th className="px-4 py-3 text-center w-32">Date</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {filteredItems.map((item) => {
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
                        <span className="font-bold text-slate-800">{item.qty} {item.unit}</span>
                      )}
                    </td>

                    {activeTab === 'Pending' && (
                      <td className="px-4 py-3 text-right">
                        {selectedIds.includes(item.id) ? (
                          <span className={`font-bold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {remaining} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'Dispatched' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {activeTab === 'History' && (
                      <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium">
                        {new Date(item.dispatchedAt || item.uploadedAt).toLocaleString()}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispatchPage;
