const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
class ApiError extends Error {
    status;
    code;
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
async function request(path, init) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        let code;
        try {
            const body = await res.json();
            detail = body.detail ?? detail;
            code = body.code;
        }
        catch {
            /* ignore */
        }
        throw new ApiError(res.status, detail, code);
    }
    return res.json();
}
function uuid() {
    if (crypto.randomUUID)
        return crypto.randomUUID();
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}
export const api = {
    listTransactions: (limit = 50, offset = 0) => request(`/transactions?limit=${limit}&offset=${offset}`),
    getStats: () => request('/stats'),
    simulateBatch: (n) => request(`/simulate/batch?n=${n}`, { method: 'POST' }),
    createTransaction: (body) => request('/transactions', {
        method: 'POST',
        headers: { 'Idempotency-Key': uuid() },
        body: JSON.stringify(body),
    }),
};
export { ApiError };
