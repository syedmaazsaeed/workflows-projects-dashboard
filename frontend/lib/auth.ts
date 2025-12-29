'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'DEVELOPER' | 'VIEWER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        api.setToken(token);
        set({ token });
      },

      login: async (email, password) => {
        const response = await api.login(email, password);
        set({ user: response.user as User, token: response.accessToken, isLoading: false });
      },

      register: async (name, email, password) => {
        // Register doesn't return a token - user needs to verify email first
        await api.register(name, email, password);
        // Don't set user or token - user must verify email and wait for admin approval
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // Ignore errors during logout
        }
        api.setToken(null);
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          api.setToken(token);
          const user = await api.getMe();
          set({ user: user as User, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
          api.setToken(null);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

