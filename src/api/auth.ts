import apiClient from './client';

export interface UserDto {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
}

export async function apiRegister(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register', { email, password });
  return data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
  return data;
}

export async function apiMe(): Promise<UserDto> {
  const { data } = await apiClient.get<{ user: UserDto }>('/api/auth/me');
  return data.user;
}
