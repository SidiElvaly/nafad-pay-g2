import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { BatchForm } from './components/BatchForm';
import { StatsBanner } from './components/StatsBanner';
import { Toast } from './components/Toast';
import { TxTable } from './components/TxTable';
export default function App() {
    const [toast, setToast] = useState(null);
    return (_jsxs("div", { className: "min-h-screen bg-slate-50", children: [_jsx("header", { className: "bg-white border-b border-slate-200", children: _jsxs("div", { className: "max-w-6xl mx-auto px-4 py-5 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-900", children: "NAFAD-PAY \u00B7 Simulator" }), _jsx("p", { className: "text-sm text-slate-500", children: "Group 2 \u00B7 Platform & API \u00B7 MRU mobile-money demo" })] }), _jsx("a", { href: "http://localhost:8000/docs", target: "_blank", rel: "noopener noreferrer", className: "text-sm text-brand-600 hover:text-brand-700 font-semibold", children: "API docs \u2197" })] }) }), _jsxs("main", { className: "max-w-6xl mx-auto px-4 py-8", children: [_jsx(StatsBanner, {}), _jsx(BatchForm, { onSuccess: (msg) => setToast({ kind: 'success', msg }), onError: (msg) => setToast({ kind: 'error', msg }) }), _jsx(TxTable, {})] }), toast && _jsx(Toast, { kind: toast.kind, message: toast.msg, onClose: () => setToast(null) }), _jsx("footer", { className: "max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-500", children: "SupNum NAFAD-PAY project \u00B7 seeded with 100 000 historical transactions" })] }));
}
