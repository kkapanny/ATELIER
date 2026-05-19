import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "guest" | "client" | "master" | "admin";

export interface AuthUser {
  id: number;
  login: string;
  email?: string | null;
  fullName: string;
  role: Role;
  discountPercent?: number;
  category?: "regular" | "casual" | null;
  masterId?: number | null;
  clientId?: number | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
  role: () => Role;
  isAuthed: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      clear: () => set({ accessToken: null, user: null }),
      role: () => get().user?.role ?? "guest",
      isAuthed: () => !!get().accessToken && !!get().user,
    }),
    {
      name: "atelier-auth",
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    },
  ),
);
