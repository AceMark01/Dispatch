import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download, X, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { currentStock } from '../utils/inventory';
import { useSettingsStore } from '../store/settingsStore';

// Build a nicely formatted order PDF (Item Name, Current Stock, Order Qty ...)
const buildPdf = (items) => {
  const doc = new jsPDF();
  doc.setFontSize(15);
  doc.text('Order List — Acemark', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}   |   ${items.length} items`, 14, 22);
  doc.setTextColor(0);
  autoTable(doc, {
    startY: 27,
    head: [['SN', 'Item Name', 'Reorder Level', 'Shelf Qty', 'MOQ', 'Current Stock', 'Order Qty']],
    body: items.map(i => [
      i.serialNo || '',
      i.itemName || '',
      String(i.roiQty ?? ''),
      String(i.shelf1 ?? ''),
      String(i.moq ?? ''),
      String(currentStock(i.qty)),
      String(i.orderQty ?? ''),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });
  return doc;
};

const ShareOrderButton = ({ items = [], label = 'Share' }) => {
  const [open, setOpen] = useState(false);
  const { whatsapp } = useSettingsStore();

  const makeFile = () => {
    const doc = buildPdf(items);
    const blob = doc.output('blob');
    return { doc, file: new File([blob], 'order-list.pdf', { type: 'application/pdf' }) };
  };

  const canShareFiles = (file) => navigator.canShare && navigator.canShare({ files: [file] });

  const handleDownloadPdf = () => {
    if (!items.length) { toast.error('No items to share'); return; }
    buildPdf(items).save('order-list.pdf');
    toast.success('PDF downloaded');
    setOpen(false);
  };

  const handleDownloadCsv = () => {
    if (!items.length) { toast.error('No items to share'); return; }
    const head = ['SN', 'Item Name', 'Reorder Level', 'Shelf Qty', 'MOQ', 'Current Stock', 'Order Qty'];
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = items.map(i => [i.serialNo, i.itemName, i.roiQty, i.shelf1, i.moq, currentStock(i.qty), i.orderQty]);
    const csv = [head, ...rows].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'order-list.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
    setOpen(false);
  };

  // Single "Share PDF" action — native share sheet (WhatsApp / Email / anything),
  // with a WhatsApp fallback on desktop.
  const handleShare = async () => {
    if (!items.length) { toast.error('No items to share'); return; }
    const { doc, file } = makeFile();

    if (canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: 'Order List', text: 'Order list — please review the order quantities.' });
      } catch (e) { /* user cancelled */ }
      setOpen(false);
      return;
    }

    // Desktop fallback: download the PDF, then open WhatsApp to attach it
    doc.save('order-list.pdf');
    const num = (whatsapp.partyPhone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent('Order list ready — please see the attached PDF for order quantities.');
    window.open(num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
    toast('PDF downloaded — attach it in the chat', { icon: '📎' });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg flex items-center gap-2 text-xs font-bold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all"
      >
        <Share2 size={16} /> {label}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-blue-600" /> Share Order PDF</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-500">{items.length} items · Item Name, Current Stock, Order Qty</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={handleShare} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                <Share2 className="text-emerald-600" size={20} />
                <span className="text-sm font-bold text-emerald-800">Share PDF</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleDownloadPdf} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Download className="text-slate-600" size={18} />
                  <span className="text-sm font-bold text-slate-700">PDF</span>
                </button>
                <button onClick={handleDownloadCsv} className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Download className="text-slate-600" size={18} />
                  <span className="text-sm font-bold text-slate-700">CSV</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center">On phone, Share opens the app sheet (WhatsApp, Email…) and attaches the PDF directly.</p>
          </div>
        </div>, document.body)}
    </>
  );
};

export default ShareOrderButton;
