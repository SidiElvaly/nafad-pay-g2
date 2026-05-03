import type { BatchResult, Stats, Transaction, TxListResponse } from './types';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
      code = body.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail, code);
  }
  return res.json();
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const api = {
  listTransactions: (limit = 50, offset = 0) =>
    request<TxListResponse>(`/transactions?limit=${limit}&offset=${offset}`),

  getStats: () => request<Stats>('/stats'),

  simulateBatch: (n: number) =>
    request<BatchResult>(`/simulate/batch?n=${n}`, { method: 'POST' }),

  createTransaction: (body: Partial<Transaction>) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      headers: { 'Idempotency-Key': uuid() },
      body: JSON.stringify(body),
    }),
};

export { ApiError };
