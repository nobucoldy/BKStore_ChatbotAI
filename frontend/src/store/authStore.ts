'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginPayload, RegisterPayload } from '@/types';
import {
  loginApi,
  registerApi,
  fetchMeApi,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
} from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalReason: string;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: (redirectToHome?: boolean) => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isAuthModalOpen: false,
      authModalReason: '',

      openAuthModal: (reason?: string) => {
        set({ isAuthModalOpen: true, authModalReason: reason || '' });
      },

      closeAuthModal: () => {
        set({ isAuthModalOpen: false, authModalReason: '' });
      },

      initialize: async () => {
        const storedToken = getAuthToken() || get().token;
        if (!storedToken) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('bkstore-cart-storage');
            } catch {}
          }
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return;
        }

        // Ensure token is synced to local storage key
        setAuthToken(storedToken);

        try {
          const res = await fetchMeApi();
          if (res.success && res.data) {
            set({
              user: res.data,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else if (res.error?.includes('hết hạn') || res.error?.includes('Chưa đăng nhập')) {
            removeAuthToken();
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          // In case of transient network issue, preserve existing hydrated session
          set({ isLoading: false });
        }
      },

      login: async (payload: LoginPayload) => {
        set({ isLoading: true });
        try {
          const res = await loginApi(payload);
          if (res.success && res.data) {
            setAuthToken(res.data.token);
            set({
              user: res.data.user,
              token: res.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
            throw new Error(res.error || 'Đăng nhập không thành công.');
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true });
        try {
          const res = await registerApi(payload);
          if (res.success && res.data) {
            setAuthToken(res.data.token);
            set({
              user: res.data.user,
              token: res.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
            throw new Error(res.error || 'Đăng ký không thành công.');
          }
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: (redirectToHome = false) => {
        removeAuthToken();
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('bkstore-cart-storage');
            localStorage.removeItem('bkstore-auth-storage');
          } catch {}

          const pathname = window.location.pathname;
          const isSecurePage =
            pathname.startsWith('/admin') ||
            pathname.startsWith('/profile') ||
            pathname.startsWith('/orders');

          if (isSecurePage || redirectToHome) {
            window.location.href = '/';
          } else {
            window.location.reload();
          }
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isAuthModalOpen: false,
          authModalReason: '',
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'bkstore-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
