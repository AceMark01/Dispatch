import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// WhatsApp order-confirmation settings.
// Source of truth = the "Config" sheet (row 2). localStorage is just a fast cache
// so the values show instantly on load, then get refreshed from the sheet.
//
// Config sheet layout (row 1 = header, row 2 = values):
//   A: enabled | B: partyPhone | C: partyName | D: note | E: link
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      whatsapp: {
        enabled: true,
        partyPhone: '',
        partyName: 'Bhatia Enterprises',
        note: 'Your latest order is ready for confirmation.',
        link: 'https://your-app.vercel.app',
      },

      setWhatsapp: (data) =>
        set((state) => ({ whatsapp: { ...state.whatsapp, ...data } })),

      // Load config from the "Config" sheet (row 2) — called on app start
      loadWhatsappFromSheet: async () => {
        try {
          const { fetchSheetData } = await import('../utils/api');
          const raw = await fetchSheetData('Config');
          if (raw && raw.length > 1) {
            const r = raw[1]; // row 2 = data
            set({
              whatsapp: {
                enabled: String(r[0]).toLowerCase() !== 'false',
                partyPhone: (r[1] || '').toString().trim(),
                partyName: (r[2] || '').toString().trim(),
                note: (r[3] || '').toString(),
                link: (r[4] || '').toString().trim(),
              },
            });
          }
        } catch (e) {
          console.warn('Config sheet not loaded (create a "Config" tab):', e.message);
        }
      },

      // Save config to the "Config" sheet (row 2) + update local state
      saveWhatsappToSheet: async (data) => {
        set((state) => ({ whatsapp: { ...state.whatsapp, ...data } }));
        const wa = get().whatsapp;
        const { updateRow } = await import('../utils/api');
        const rowData = [
          wa.enabled ? 'TRUE' : 'FALSE',
          wa.partyPhone || null,
          wa.partyName || null,
          wa.note || null,
          wa.link || null,
        ];
        return await updateRow(2, rowData, 'Config');
      },
    }),
    { name: 'dispatch-settings' }
  )
);
