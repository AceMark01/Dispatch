import React, { useState, useEffect } from 'react';
import { Save, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';

// WhatsApp order-confirmation settings. Saved permanently to the "Config" sheet,
// then used automatically on the Upload page when a stock file is saved.
const WhatsAppSettings = () => {
  const { whatsapp, loadWhatsappFromSheet, saveWhatsappToSheet } = useSettingsStore();
  const [form, setForm] = useState(whatsapp);
  const [saving, setSaving] = useState(false);

  // Load latest from the Config sheet on mount, then keep the form in sync
  useEffect(() => {
    loadWhatsappFromSheet();
  }, [loadWhatsappFromSheet]);

  useEffect(() => {
    setForm(whatsapp);
  }, [whatsapp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveWhatsappToSheet(form);
      if (res && res.success) toast.success('WhatsApp settings saved permanently');
      else toast.error(`Save failed: ${res?.error || 'create a "Config" sheet tab'}`);
    } catch (e) {
      toast.error('Save failed — check the "Config" sheet / connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle size={16} className="text-emerald-600" /> Order Confirmation (WhatsApp)
        </h3>
        <label className="flex items-center gap-2 text-xs font-bold text-emerald-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => setForm({ ...form, enabled: e.target.checked })}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
          />
          Send on upload
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Party WhatsApp No. (with country code)</label>
          <input type="tel" value={form.partyPhone} onChange={e => setForm({ ...form, partyPhone: e.target.value })} placeholder="9198XXXXXXXX" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Party Name (Var 1)</label>
          <input type="text" value={form.partyName} onChange={e => setForm({ ...form, partyName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Note (Var 2)</label>
          <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 transition-colors" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Link (Var 3)</label>
          <input type="text" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500 transition-colors" />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[10px] text-slate-500">Saved once here — used automatically when a stock file is uploaded &amp; saved.</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
