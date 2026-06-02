import { api } from '../api';
import type {
  AuthSession,
  DashboardData,
  RoleDashboard,
  UserNotificationResponse,
  UserPreferences,
  UserProfileData
} from '../types';

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthSession>('/auth/login', { email, password });
  return data;
}

export async function refreshToken(refreshToken: string) {
  const { data } = await api.post<AuthSession>('/auth/refresh', { refreshToken });
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ message: string; resetUrl?: string }>('/auth/forgot-password', { email });
  return data;
}

export const forgotPassword = requestPasswordReset;

export async function resetPassword(input: { token: string; password: string }) {
  const { data } = await api.post<{ ok: true; message: string }>('/auth/reset-password', input);
  return data;
}

export async function logout(refreshToken: string) {
  const { data } = await api.post<{ ok: true }>('/auth/logout', { refreshToken });
  return data;
}

export async function loadDashboard() {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
}

export async function loadMyDashboard() {
  const { data } = await api.get<RoleDashboard>('/me/dashboard');
  return data;
}

export async function loadMyProfile() {
  const { data } = await api.get<UserProfileData>('/me/profile');
  return data;
}

export async function updateMyProfile(input: { name: string; lastName: string }) {
  const { data } = await api.patch('/me/profile', input);
  return data;
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  const { data } = await api.patch<{ ok: true }>('/me/password', input);
  return data;
}

export async function loadMyNotifications() {
  const { data } = await api.get<UserNotificationResponse>('/me/notifications');
  return data;
}

export async function markMyNotificationRead(id: string) {
  const { data } = await api.patch<{ ok: true }>(`/me/notifications/${id}/read`);
  return data;
}

export async function markAllMyNotificationsRead() {
  const { data } = await api.patch<{ ok: true; count: number }>('/me/notifications/read-all');
  return data;
}

export async function updateMyPreferences(preferences: UserPreferences) {
  const { data } = await api.patch<{ preferences: UserPreferences }>('/me/preferences', preferences);
  return data.preferences;
}
