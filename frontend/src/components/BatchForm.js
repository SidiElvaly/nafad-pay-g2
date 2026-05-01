import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api, ApiError } from '../api';
export function BatchForm({ onSuccess, onError }) {
    const [n, setN] = useState(100);
    const [loading, setLoading] = useState(false);
    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const r = await api.simulateBatch(n);
            onSuccess(`Generated ${r.generated} transactions in ${r.duration_ms} ms`);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : e.message;
            onError(`Batch failed: ${msg}`);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("form", { onSubmit: submit, className: "bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6 flex flex-wrap items-end gap-4", children: [_jsxs("div", { className: "flex-1 min-w-[180px]", children: [_jsx("label", { htmlFor: "batch-n", className: "block text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1", children: "Number of transactions" }), _jsx("input", { id: "batch-n", type: "number", min: 1, max: 10000, value: n, onChange: (e) => setN(Math.max(1, Math.min(10000, Number(e.target.value) || 1))), className: "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition" })] }), _jsx("button", { type: "submit", disabled: loading, className: "rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white font-semibold px-5 py-2.5 transition shadow-sm", children: loading ? 'Generating…' : `Generate ${n}` }), _jsxs("p", { className: "text-sm text-slate-500 basis-full md:basis-auto", children: ["Bulk-inserts via ", _jsx("code", { className: "bg-slate-100 px-1 rounded", children: "POST /simulate/batch" }), " using empirical distributions."] })] }));
}
