import React, { useState } from 'react';
import { useDispatchStore } from '../store/dispatchStore';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadReport = () => {
  const { items, addItems } = useDispatchStore();
  const [previewData, setPreviewData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const filteredItems = items.filter(i => {
    const matchesSearch = i.itemDetails.toLowerCase().includes(search.toLowerCase()) ||
                         i.itemCode.toLowerCase().includes(search.toLowerCase()) ||
                         i.serialNo?.toString().includes(search);
    const matchesGroup = filterGroup === 'All' || i.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const groups = ['All', ...new Set(items.map(item => item.group))];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map excel columns to our format
        const mappedData = data.map((row, idx) => ({
          serialNo: row['Serial No'] || row['S.No'] || idx + 1,
          itemDetails: row['Item Details'] || row['Item Name'] || 'N/A',
          group: row['Group'] || 'N/A',
          itemCode: row['Item Code'] || 'N/A',
          qty: row['Qty'] || row['Quantity'] || 0,
          unit: row['Unit'] || 'PCS',
          remark: row['Remark'] || '',
        }));

        setPreviewData(mappedData);
        toast.success(`Parsed ${mappedData.length} rows successfully`);
      } catch (err) {
        toast.error('Error parsing excel file');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = () => {
    if (previewData.length === 0) return;
    setIsUploading(true);
    setTimeout(() => {
      addItems(previewData);
      setPreviewData([]);
      setIsUploading(false);
      toast.success('Report uploaded successfully');
    }, 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Upload Report</h1>
        <p className="text-sm text-slate-500">Ace-Mark Company | Client: Bhatiya</p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Choose Excel File</h2>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">Supported formats: .xlsx, .xls, .csv</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
            className="hidden" 
            id="excel-upload"
          />
          <label 
            htmlFor="excel-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-sm transition-all uppercase tracking-wider"
          >
            Select File
          </label>
        </div>
      </div>

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-blue-600" />
              Preview Data ({previewData.length} rows)
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setPreviewData([])}
                className="px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
              >
                <Trash2 size={16} /> Clear
              </button>
              <button 
                onClick={handleSave}
                disabled={isUploading}
                className="px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-sm"
              >
                {isUploading ? 'Saving...' : <><Check size={16} /> Import to Table</>}
              </button>
            </div>
          </div>

          <div className="overflow-auto flex-1 scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider z-10">
                <tr>
                  <th className="px-4 py-3">SN</th>
                  <th className="px-4 py-3">Remark</th>
                  <th className="px-4 py-3">Item Details</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors text-[12px]">
                    <td className="px-4 py-3 font-medium text-slate-400">#{row.serialNo}</td>
                    <td className="px-4 py-3 italic text-slate-500">{row.remark || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{row.itemDetails}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.itemCode} | {row.group}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{row.qty} {row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Card */}
      {previewData.length === 0 && (
        <div className="flex items-center gap-2 text-[11px] text-blue-600 bg-blue-50/50 p-2 px-4 rounded-lg border border-blue-100/50">
          <AlertCircle size={14} />
          <span className="font-bold uppercase tracking-tight">Required Columns:</span>
          <span className="opacity-80">Serial No, Item Details, Group, Item Code, Qty, Unit.</span>
        </div>
      )}

      {/* All Uploaded Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Master Report ({items.length} records)</h3>
            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Inventory Status</div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search master data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-xs font-medium transition-all shadow-sm ${
                showFilters || filterGroup !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <Filter size={16} /> Filter
            </button>
          </div>

          {showFilters && (
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex gap-4 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Group</label>
                <select 
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="block w-40 px-3 py-1 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        
        <div className="overflow-auto flex-1 scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-10 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3 w-48">Remark</th>
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3 w-24 text-right">Qty</th>
                <th className="px-4 py-3 text-center w-24">Status</th>
                <th className="px-4 py-3 text-center w-32">Updated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700">
              {filteredItems.slice().reverse().map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-400 text-center">#{item.serialNo}</td>
                  <td className="px-4 py-3 italic text-slate-500 truncate max-w-[150px]">{item.remark || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{item.itemDetails}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">{item.itemCode}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{item.group}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.qty} {item.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                      item.status === 'Dispatched' ? 'bg-blue-100 text-blue-700 shadow-sm' :
                      item.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700 shadow-sm' :
                      item.status === 'Approved' ? 'bg-purple-100 text-purple-700 shadow-sm' :
                      'bg-amber-100 text-amber-700 shadow-sm'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[10px] text-slate-400">
                    {new Date(item.dispatchedAt || item.confirmedAt || item.approvedAt || item.uploadedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">
                    No matching records found
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

export default UploadReport;
