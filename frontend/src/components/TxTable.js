import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
function formatAmount(s, currency) {
    const n = Number(s);
    if (Number.isNaN(n))
        return s;
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)} ${currency}`;
}
function formatTime(date, time) {
    return `${date} ${time}`;
}
export function TxTable() {
    const [txs, setTxs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let alive = true;
        const fetchTxs = async () => {
            try {
                const r = await api.listTransactions(50);
                if (alive) {
                    setTxs(r.items);
                    setTotal(r.total);
                    setLoading(false);
                    setError(null);
                }
            }
            catch (e) {
                if (alive) {
                    setError(e.message);
                    setLoading(false);
                }
            }
        };
        fetchTxs();
        const id = setInterval(fetchTxs, 2000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, []);
    return (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", children: [_jsxs("div", { className: "px-5 py-3 border-b border-slate-200 flex justify-between items-center", children: [_jsx("h2", { className: "font-semibold text-slate-800", children: "Recent transactions" }), _jsxs("span", { className: "text-sm text-slate-500", children: ["showing ", txs.length, " of ", new Intl.NumberFormat('en-US').format(total), " \u00B7 refreshing every 2s"] })] }), error && (_jsxs("div", { className: "px-5 py-3 text-sm text-rose-600 bg-rose-50 border-b border-rose-200", children: ["Failed to load transactions: ", error] })), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-slate-600", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Reference" }), _jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Type" }), _jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Amount" }), _jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Wilaya" }), _jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Status" }), _jsx("th", { className: "text-right px-4 py-2.5 font-semibold", children: "Latency" }), _jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "Node" }), _jsx("th", { className: "text-left px-4 py-2.5 font-semibold", children: "When" })] }) }), _jsx("tbody", { children: loading && txs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "text-center text-slate-400 py-10", children: "Loading\u2026" }) })) : txs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "text-center text-slate-400 py-10", children: "No transactions yet \u2014 click \"Generate\" above." }) })) : (txs.map((tx) => (_jsxs("tr", { className: `border-t border-slate-100 ${tx.status === 'FAILED' ? 'bg-rose-50/50' : 'bg-emerald-50/30'}`, children: [_jsx("td", { className: "px-4 py-2 font-mono text-xs", children: tx.reference }), _jsx("td", { className: "px-4 py-2", children: _jsx("span", { className: "inline-block bg-slate-100 text-slate-700 rounded px-2 py-0.5 text-xs font-semibold", children: tx.transaction_type }) }), _jsx("td", { className: "px-4 py-2 text-right tabular-nums", children: formatAmount(tx.amount, tx.currency) }), _jsx("td", { className: "px-4 py-2 text-slate-600", children: tx.wilaya_name ?? `#${tx.wilaya_id}` }), _jsxs("td", { className: "px-4 py-2", children: [_jsx("span", { className: `inline-block rounded px-2 py-0.5 text-xs font-semibold ${tx.status === 'SUCCESS'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-rose-100 text-rose-700'}`, children: tx.status }), tx.failure_reason && (_jsx("span", { className: "ml-2 text-xs text-slate-500", children: tx.failure_reason }))] }), _jsxs("td", { className: "px-4 py-2 text-right tabular-nums text-slate-600", children: [tx.processing_latency_ms, " ms"] }), _jsx("td", { className: "px-4 py-2 font-mono text-xs text-slate-600", children: tx.node_id }), _jsx("td", { className: "px-4 py-2 text-xs text-slate-500", children: formatTime(tx.transaction_date, tx.transaction_time) })] }, tx.id)))) })] }) })] }));
}
