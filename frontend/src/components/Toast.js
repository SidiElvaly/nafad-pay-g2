import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
const COLORS = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-slate-700',
};
export function Toast({ kind, message, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (_jsx("div", { role: "status", className: `fixed top-6 right-6 z-50 rounded-lg px-4 py-3 text-white shadow-lg ${COLORS[kind]}`, children: message }));
}
