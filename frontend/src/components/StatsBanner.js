import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
function formatNumber(n) {
    return new Intl.NumberFormat('en-US').format(n);
}
export function StatsBanner() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        let alive = true;
        const fetchStats = async () => {
            try {
                const s = await api.getStats();
                if (alive) {
                    setStats(s);
                    setError(null);
                }
            }
            catch (e) {
                if (alive)
                    setError(e.message);
            }
        };
        fetchStats();
        const id = setInterval(fetchStats, 5000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, []);
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-8", children: [_jsx(Card, { label: "Total transactions", value: stats ? formatNumber(stats.total_count) : '…', accent: "brand" }), _jsx(Card, { label: "Today's volume", value: stats ? formatNumber(stats.today_volume) : '…', accent: "brand" }), _jsx(Card, { label: "Success rate", value: stats ? `${(stats.success_rate * 100).toFixed(1)}%` : '…', accent: stats && stats.success_rate > 0.5 ? 'success' : 'danger' }), _jsx(Card, { label: "Tx / second", value: stats ? stats.tx_per_second.toFixed(2) : '…', accent: "brand" }), error && (_jsxs("div", { className: "md:col-span-4 text-sm text-rose-600 bg-rose-50 rounded p-2 border border-rose-200", children: ["API unreachable: ", error] }))] }));
}
function Card({ label, value, accent, }) {
    const accentClasses = {
        brand: 'border-brand-100 text-brand-700',
        success: 'border-emerald-200 text-emerald-700',
        danger: 'border-rose-200 text-rose-700',
    }[accent];
    return (_jsxs("div", { className: `bg-white rounded-xl border ${accentClasses} p-5 shadow-sm`, children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-slate-500 font-semibold", children: label }), _jsx("div", { className: "mt-2 text-3xl font-bold tabular-nums", children: value })] }));
}
