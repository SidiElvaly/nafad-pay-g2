import { useEffect } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastProps {
  kind: ToastKind;
  message: string;
  onClose: () => void;
}

const STYLES: Record<ToastKind, { bar: string; iconBg: string; iconColor: string; icon: JSX.Element }> = {
  success: {
    bar: 'border-emerald-200',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    bar: 'border-rose-200',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    bar: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-.001V10a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export function Toast({ kind, message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const s = STYLES[kind];

  return (
    <div
      role="status"
      className={`fixed top-6 right-6 z-50 flex items-start gap-3 bg-white rounded-xl border ${s.bar} shadow-card-hover px-4 py-3 pr-3 min-w-[280px] max-w-md animate-slide-in-right`}
    >
      <div className={`${s.iconBg} ${s.iconColor} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
        {s.icon}
      </div>
      <div className="flex-1 text-sm text-slate-800 pt-1.5">{message}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="text-slate-400 hover:text-slate-600 transition p-1 -m-1 rounded"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
