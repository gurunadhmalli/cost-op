import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'operator' | 'viewer';

interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  token: string;
}

interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

// Persisted to localStorage so a refresh doesn't drop the session. The
// backend issues a real JWT on login/signup (see backend/app/api/auth.py);
// it's stored on the user object and sent as a Bearer token by
// services/api.ts and (as a query param) by hooks/useChatSocket.ts.
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

// canAct: "operator or admin" — the app's one write-capable tier, used to
// gate What-If and implement-recommendation actions in the UI. This mirrors
// (but does not replace) the backend's own require_roles("operator",
// "admin") checks — the UI gate is for a clean experience, the backend
// check is what actually enforces it.
export function canAct(role: Role | undefined): boolean {
  return role === 'operator' || role === 'admin';
}
