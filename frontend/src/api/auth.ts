import { api } from './client';
import type { LoginResponse, User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function fetchProfile(): Promise<User> {
  const { data } = await api.get<User>('/auth/profile');
  return data;
}
