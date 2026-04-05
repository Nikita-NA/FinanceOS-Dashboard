import { api } from './client';
import type { Paginated, Role, User, UserStatus } from '@/types';

export interface UserQuery {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
}

export async function listUsers(q: UserQuery): Promise<Paginated<User>> {
  const { data } = await api.get<Paginated<User>>('/users', { params: q });
  return data;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
}

export async function updateUserRole(id: string, role: Role): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}/role`, { role });
  return data;
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}/status`, { status });
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
