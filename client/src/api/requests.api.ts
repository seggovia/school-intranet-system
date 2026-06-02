import { api } from '../api';
import type { RequestTicket } from '../types';

export async function loadRequests() {
  const { data } = await api.get<RequestTicket[]>('/requests');
  return data;
}

export async function updateRequestStatus(id: string, status: string) {
  const { data } = await api.patch<RequestTicket>(`/requests/${id}/status`, { status });
  return data;
}
