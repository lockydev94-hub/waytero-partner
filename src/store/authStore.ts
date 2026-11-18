// ============================================================
// WAYTERO PARTNER PORTAL — AUTH STORE (Zustand)
// Doc Ref: Auth Flow §6 | Frontend Architecture §37 State Management
// Fix: Register session-cleared callback so clearSession() (called from axios interceptor)
//      immediately resets in-memory Zustand state — prevents RequireAuth from briefly
//      passing with stale isAuthenticated=true after token expiry.
// ============================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "../types/auth";
import { TOKEN_KEYS, clearSession, registerSessionClearedCallback } from "../services/api";
import { useLockStore } from "../stores/lockStore";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setMustChangePassword: (value: boolean) => void;
  updateUser: (user: AuthUser) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      // Register callback so the axios interceptor can reset in-memory state synchronously.
      // Called once at store creation time (module load), before any React render.
      registerSessionClearedCallback(() => {
        set({ user: null, isAuthenticated: false, mustChangePassword: false, isLoading: false });
      });

      return {
        user: null,
        isAuthenticated: false,
        mustChangePassword: false,
        isLoading: false,

        setAuth: (user, accessToken, refreshToken) => {
          localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
          localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
          // A fresh sign-in starts an unlocked session with a fresh idle window.
          useLockStore.getState().startSession();
          set({
            user,
            isAuthenticated: true,
            mustChangePassword: user.must_change_password ?? false,
            isLoading: false,
          });
        },

        setMustChangePassword: (value) => set({ mustChangePassword: value }),

        updateUser: (user) => {
          set({ user, mustChangePassword: user.must_change_password ?? false });
        },

        clearAuth: () => {
          clearSession();
          set({ user: null, isAuthenticated: false, mustChangePassword: false, isLoading: false });
        },

        setLoading: (loading) => set({ isLoading: loading }),
      };
    },
    {
      name: "pp_auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);
