import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, MessageCircle, Mail, Download, X, FileText } from 'lucide-react';
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
    head: [['SN', 'Item Name', 'Group', 'Current Stock', 'Order Qty']],
    body: items.map(i => [
      i.serialNo || '',
      i.itemName || '',
      i.group || '',
      String(currentStock(i.qty)),
      String(i.orderQty ?? ''),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
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

  const handleDownload = () => {
    if (!items.length) { toast.error('No items to share'); return; }
    buildPdf(items).save('order-list.pdf');
    toast.success('PDF downloaded');
    setOpen(false);
  };

  const handleShare = async (channel) => {
    if (!items.length) { toast.error('No items to share'); return; }
    const { doc, file } = makeFile();

    // Mobile / supported browsers: native share sheet (PDF attaches to WhatsApp, Email, etc.)
    if (canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: 'Order List', text: 'Order list — please review the order quantities.' });
      } catch (e) { /* user cancelled */ }
      setOpen(false);
      return;
    }

    // Desktop fallback: download the PDF, then open the chosen channel
    doc.save('order-list.pdf');
    if (channel === 'whatsapp') {
      const num = (whatsapp.partyPhone || '').replace(/[^0-9]/g, '');
      const text = encodeURIComponent('Order list ready — please see the attached PDF for order quantities.');
      window.open(num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
      toast('PDF downloaded — attach it in WhatsApp', { icon: '📎' });
    } else if (channel === 'email') {
      const subject = encodeURIComponent('Order List — Acemark');
      const body = encodeURIComponent('Please find the order list attached (the PDF has been downloaded).');
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      toast('PDF downloaded — attach it in your email', { icon: '📎' });
    }
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-blue-700 shadow-sm transition-all"
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
              <button onClick={() => handleShare('whatsapp')} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                <MessageCircle className="text-emerald-600" size={20} />
                <span className="text-sm font-bold text-emerald-800">Share on WhatsApp</span>
              </button>
              <button onClick={() => handleShare('email')} className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                <Mail className="text-blue-600" size={20} />
                <span className="text-sm font-bold text-blue-800">Send via Email</span>
              </button>
              <button onClick={handleDownload} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                <Download className="text-slate-600" size={20} />
                <span className="text-sm font-bold text-slate-700">Download PDF</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">On phone, the app share sheet opens and the PDF attaches directly. On desktop, the PDF downloads to attach.</p>
          </div>
        </div>, document.body)}
    </>
  );
};

export default ShareOrderButton;
