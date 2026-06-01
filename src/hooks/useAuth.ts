import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  return { user, token, isAuthenticated: !!token, login, logout };
}
