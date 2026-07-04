import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// One-time saved settings. Currently holds the WhatsApp order-confirmation
// config that gets used automatically when a stock file is uploaded/saved.
export const useSettingsStore = create(
  persist(
    (set) => ({
      whatsapp: {
        enabled: true,
        partyPhone: '',
        partyName: 'Bhatia Enterprises',
        note: 'Your latest order is ready for confirmation.',
        link: 'https://your-app.vercel.app',
      },
      setWhatsapp: (data) =>
        set((state) => ({ whatsapp: { ...state.whatsapp, ...data } })),
    }),
    { name: 'dispatch-settings' }
  )
);
