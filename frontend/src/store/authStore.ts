import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  userId: string;
  email: string;
}

interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

// Persisted to localStorage so a refresh doesn't drop the session — this is
// a demo-grade prototype (the backend itself has no JWT/session layer, see
// backend/app/main.py), so "logged in" is just "we have a verified user".
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'aura-cost-auth' }
  )
);
