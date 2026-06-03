import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatchStore } from '../store/dispatchStore';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2, Search, Filter, Download, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadReport = () => {
  const { items, addItems } = useDispatchStore();
  const [previewData, setPreviewData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);

  // Parse any serial format to a number
  const parseSerial = (val) => {
    if (!val) return 0;
    const match = val.toString().trim().match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Format a serial number as SN-001
  const formatSerialNo = (val) => {
    const n = parseSerial(val);
    if (!n) return val || '';
    return `SN-${n.toString().padStart(3, '0')}`;
  };

  // Compute next serial number: max across sheet items + preview batch + 1
  const getNextSerialNo = (currentPreview = previewData) => {
    const allSerials = [
      ...items.map(i => parseSerial(i.serialNo)),
      ...currentPreview.map(i => parseSerial(i.serialNo)),
    ];
    const maxSerial = allSerials.length > 0 ? Math.max(...allSerials) : 0;
    const next = maxSerial + 1;
    return `SN-${next.toString().padStart(3, '0')}`;
  };

  const [manualItem, setManualItem] = useState({
    serialNo: '', itemName: '', group: '', item: '', roiQty: '', shelf1: '', qty: '', unit: 'PCS', remark: ''
  });

  const filteredItems = items.filter(i => {
    const matchesSearch = i.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      i.item?.toLowerCase().includes(search.toLowerCase()) ||
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

        let currentMaxSerial = 0;
        const allSerials = [
          ...items.map(i => parseSerial(i.serialNo)),
          ...previewData.map(i => parseSerial(i.serialNo))
        ];
        if (allSerials.length > 0) {
           currentMaxSerial = Math.max(...allSerials);
        }

        // Map excel columns to our format
        const mappedData = data.map((row) => {
          let snRaw = row['Serial No'] || row['S.No'];
          let sn;

          if (!snRaw) {
            currentMaxSerial++;
            sn = `SN-${currentMaxSerial.toString().padStart(3, '0')}`;
          } else {
            const parsed = parseSerial(snRaw);
            if (parsed > 0) {
              if (parsed > currentMaxSerial) currentMaxSerial = parsed;
              sn = `SN-${parsed.toString().padStart(3, '0')}`;
            } else {
              sn = String(snRaw);
            }
          }

          return {
            serialNo: sn,
            itemName: row['Item Name'] || row['Item Details'] || 'N/A',
            group: row['Group'] || 'N/A',
            item: row['Item'] || row['Item Code'] || 'N/A',
            roiQty: row['ROI Qty'] || '',
            shelf1: row['Shelf 1'] || '',
            qty: row['Qty'] || row['Quantity'] || 0,
            unit: row['Unit'] || 'PCS',
            remark: row['Remark'] || '',
          };
        });

        setPreviewData(prev => [...prev, ...mappedData]);
        toast.success(`Parsed ${mappedData.length} rows successfully`);
      } catch (err) {
        toast.error('Error parsing excel file');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleSave = () => {
    if (previewData.length === 0) return;
    setIsUploading(true);
    setTimeout(() => {
      addItems(previewData);
      setPreviewData([]);
      setIsUploading(false);
      setShowImportModal(false);
      toast.success('Data imported successfully');
    }, 1000);
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Serial No': '1',
      'Item Name': 'Sample Item',
      'Group': 'Sample Group',
      'Item': 'Item Code/Name',
      'ROI Qty': '10',
      'Shelf 1': 'A1',
      'Qty': '100',
      'Unit': 'PCS'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Bulk_Upload_Template.csv");
  };

  const handleAddManualItem = () => {
    if (!manualItem.itemName || !manualItem.qty) {
      toast.error("Item Name and Qty are required");
      return;
    }
    const newPreview = [...previewData, {
      ...manualItem,
      serialNo: manualItem.serialNo || getNextSerialNo()
    }];
    setPreviewData(newPreview);
    // Reset form but pre-fill next serial no based on updated preview
    setManualItem({
      serialNo: getNextSerialNo(newPreview), itemName: '', group: '', item: '', roiQty: '', shelf1: '', qty: '', unit: 'PCS', remark: ''
    });
  };

  const removePreviewItem = (indexToRemove) => {
    setPreviewData(previewData.filter((_, idx) => idx !== indexToRemove));
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const p = n => n.toString().padStart(2, '0');
    const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear().toString().slice(-2)}`;
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const time = `${p(hours)}:${p(d.getMinutes())} ${ampm}`;
    return `${date} ${time}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Upload Report</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-500 hidden md:block">Ace-Mark Company | Client: Bhatiya</p>
        </div>
      </div>

      {/* Big Noticeable Import Box */}
      <div
        onClick={() => {
          setShowImportModal(true);
          // Pre-fill serial no when modal opens
          setManualItem(prev => ({ ...prev, serialNo: getNextSerialNo() }));
        }}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all border border-blue-500/50 group"
      >
        <div className="p-4 bg-white/20 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-inner">
          <Upload size={32} className="text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">Import / Add New Data</h2>
        <p className="text-blue-100 font-medium text-center max-w-lg">
          Click here to open the import hub. You can bulk upload data via Excel/CSV or manually enter items column by column.
        </p>
      </div>

      {/* Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-blue-600" /> Import & Add Data
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-6">

              {/* Option 1: File Upload */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="text-sm text-blue-800 font-bold flex items-center gap-2">
                    <Upload size={16} /> Bulk Upload via Excel/CSV
                  </div>
                  <p className="text-[11px] text-blue-600/80 mt-1">Download the template, fill your data, and upload the file.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadTemplate}
                    className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-sm transition-all uppercase tracking-wider flex items-center gap-2"
                  >
                    <Download size={14} /> Download Template
                  </button>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-sm transition-all uppercase tracking-wider flex items-center gap-2"
                  >
                    <FileSpreadsheet size={14} /> Select File
                  </label>
                </div>
              </div>

              {/* Option 2: Manual Entry Form */}
              <div className="space-y-3">
                <div className="text-sm text-slate-800 font-bold flex items-center gap-2">
                  <Plus size={16} className="text-emerald-600" /> Or Add Manually (Column Format)
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-end gap-2 overflow-x-auto">
                  <div className="space-y-1.5 min-w-[80px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serial No</label>
                    <input
                      type="text"
                      value={manualItem.serialNo}
                      readOnly
                      className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 outline-none cursor-default"
                      title="Auto-generated serial number"
                    />
                  </div>
                  <div className="space-y-1.5 min-w-[150px] flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Item Name*</label>
                    <input type="text" value={manualItem.itemName} onChange={e => setManualItem({ ...manualItem, itemName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="Item name" />
                  </div>
                  <div className="space-y-1.5 min-w-[120px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Group</label>
                    <input type="text" value={manualItem.group} onChange={e => setManualItem({ ...manualItem, group: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="e.g. ELECTRONICS" />
                  </div>
                  <div className="space-y-1.5 min-w-[100px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Item</label>
                    <input type="text" value={manualItem.item} onChange={e => setManualItem({ ...manualItem, item: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="Item Code" />
                  </div>
                  <div className="space-y-1.5 min-w-[80px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">ROI Qty</label>
                    <input type="number" value={manualItem.roiQty} onChange={e => setManualItem({ ...manualItem, roiQty: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="0" />
                  </div>
                  <div className="space-y-1.5 min-w-[80px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Shelf 1</label>
                    <input type="text" value={manualItem.shelf1} onChange={e => setManualItem({ ...manualItem, shelf1: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="Shelf" />
                  </div>
                  <div className="space-y-1.5 min-w-[80px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Qty*</label>
                    <input type="number" value={manualItem.qty} onChange={e => setManualItem({ ...manualItem, qty: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="0" />
                  </div>
                  <div className="space-y-1.5 min-w-[80px]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Unit</label>
                    <input type="text" value={manualItem.unit} onChange={e => setManualItem({ ...manualItem, unit: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="PCS" />
                  </div>
                  <button
                    onClick={handleAddManualItem}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 shadow-sm transition-all flex items-center gap-1 h-[34px]"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-4">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                    Preview List ({previewData.length} items)
                  </h3>
                  {previewData.length > 0 && (
                    <button
                      onClick={() => setPreviewData([])}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} /> Clear All
                    </button>
                  )}
                </div>

                <div className="overflow-auto max-h-[300px] scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-10">
                      <tr>
                        <th className="px-4 py-2.5 w-16 text-center">SN</th>
                        <th className="px-4 py-2.5">Item Name</th>
                        <th className="px-4 py-2.5">Group</th>
                        <th className="px-4 py-2.5">Item</th>
                        <th className="px-4 py-2.5 text-right">ROI Qty</th>
                        <th className="px-4 py-2.5">Shelf 1</th>
                        <th className="px-4 py-2.5 text-right">Qty</th>
                        <th className="px-4 py-2.5 text-center">Unit</th>
                        <th className="px-4 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {previewData.map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors text-[12px]">
                          <td className="px-4 py-2 font-medium text-slate-400 text-center">{formatSerialNo(row.serialNo)}</td>
                          <td className="px-4 py-2 font-bold text-slate-800">{row.itemName}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">{row.group}</td>
                          <td className="px-4 py-2 text-[10px] text-slate-500 font-mono uppercase">{row.item}</td>
                          <td className="px-4 py-2 text-right font-bold">{row.roiQty}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-slate-500">{row.shelf1}</td>
                          <td className="px-4 py-2 text-right font-bold">{row.qty}</td>
                          <td className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">{row.unit}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => removePreviewItem(i)}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {previewData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <FileSpreadsheet size={24} className="opacity-50" />
                              <span className="text-xs font-medium">No items added yet. Upload a file or add manually above.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading || previewData.length === 0}
                className="px-6 py-2 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUploading ? 'Importing...' : <><Check size={16} /> Save to Master Table</>}
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* Master Data Header Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[600px] mt-4">
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Master Report ({items.length} records)</h3>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-200 px-2 py-1 rounded-md">Inventory Status</div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search master data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-xs font-bold transition-all shadow-sm ${showFilters || filterGroup !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
                  className="block w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Master Data Table */}
        <div className="overflow-auto flex-1 scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider z-10 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-16 text-center">SN</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 w-24 text-right">ROI Qty</th>
                <th className="px-4 py-3">Shelf 1</th>
                <th className="px-4 py-3 w-24 text-right">Qty</th>
                <th className="px-4 py-3 w-16 text-center">Unit</th>
                <th className="px-4 py-3 text-center w-32">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700">
              {filteredItems.slice().reverse().map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-400 text-center">{formatSerialNo(item.serialNo)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.itemName}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{item.group}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 font-mono uppercase">{item.item}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.roiQty}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{item.shelf1}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{item.qty}</td>
                  <td className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{item.unit}</td>
                  <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {formatDateTime(item.dispatchedAt || item.confirmedAt || item.approvedAt || item.uploadedAt)}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={24} className="opacity-50" />
                      <span className="text-sm font-medium">No matching records found</span>
                    </div>
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
