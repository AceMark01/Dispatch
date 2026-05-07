import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      login: (userData) => {
        set({
          user: userData,
          isAuthenticated: true
        });
      },
      
      logout: () => {
        set({
          user: null,
          isAuthenticated: false
        });
      },
      
      initializeAuth: () => {
        // Hydrated automatically by persist middleware
      }
    }),
    {
      name: 'dispatch-auth-storage',
    }
  )
);

export { useAuthStore };
