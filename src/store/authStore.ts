import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDto } from '../api/auth';

interface AuthState {
  user: UserDto | null;
  token: string | null;
  login: (user: UserDto, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
