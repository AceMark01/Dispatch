import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDispatchStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Add items (e.g. from Excel)
      addItems: (newItems) => set((state) => ({ 
        items: [...state.items, ...newItems.map(item => ({
          ...item,
          id: item.id || Math.random().toString(36).substr(2, 9),
          status: 'Waiting for Approval', // Initial status
          uploadedAt: new Date().toISOString(),
          approvedAt: null,
          confirmedAt: null,
          dispatchedAt: null,
          confirmStatus: null, // 'Yes' or 'No'
        }))] 
      })),

      // Update item status
      updateItemStatus: (id, status, extraData = {}) => set((state) => ({
        items: state.items.map(item => 
          item.id === id ? { ...item, status, ...extraData } : item
        )
      })),

      // Bulk update (for Confirm and Dispatch pages)
      bulkUpdateStatus: (ids, status, extraData = {}) => set((state) => ({
        items: state.items.map(item => 
          ids.includes(item.id) ? { ...item, status, ...extraData } : item
        )
      })),

      // Partial dispatch logic
      partialDispatch: (id, dispatchedQty, remark) => set((state) => {
        const item = state.items.find(i => i.id === id);
        if (!item) return state;

        const originalQty = Number(item.qty);
        const dQty = Number(dispatchedQty);
        const remainingQty = originalQty - dQty;

        let updatedItems = state.items.map(i => 
          i.id === id ? { 
            ...i, 
            qty: dQty, 
            status: 'Dispatched', 
            remark: remark || i.remark,
            dispatchedAt: new Date().toISOString() 
          } : i
        );

        if (remainingQty > 0) {
          const newItem = {
            ...item,
            id: `SPLIT-${Math.random().toString(36).substr(2, 9)}`,
            qty: remainingQty,
            status: 'Confirmed', // Stays in confirmed to be dispatched later
            serialNo: item.serialNo, // Keep original SN as requested
            remark: `Remaining from ${item.id}`,
            confirmedAt: item.confirmedAt,
            approvedAt: item.approvedAt,
            uploadedAt: new Date().toISOString(),
          };
          updatedItems = [...updatedItems, newItem];
        }

        return { items: updatedItems };
      }),

      // Reset items (for testing)
      setItems: (items) => set({ items }),
    }),
    {
      name: 'dispatch-storage',
    }
  )
);
