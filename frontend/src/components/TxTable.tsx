import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Transaction } from '../types';
import { TxDetailsModal } from './TxDetailsModal';

function formatAmount(s: string, currency: string): string {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)} ${currency}`;
}

function formatTime(date: string, time: string): string {
  return `${date} ${time}`;
}

const TYPE_COLORS: Record<string, string> = {
  TRF: 'bg-blue-50 text-blue-700 ring-blue-200',
  DEP: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  WIT: 'bg-amber-50 text-amber-700 ring-amber-200',
  PAY: 'bg-violet-50 text-violet-700 ring-violet-200',
  BIL: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  AIR: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  SAL: 'bg-pink-50 text-pink-700 ring-pink-200',
  REV: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function TxTable() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

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
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
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

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900">Recent transactions</h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
            </span>
            2s
          </span>
        </div>
        <span className="text-sm text-slate-500 tabular-nums">
          showing <span className="font-semibold text-slate-700">{txs.length}</span> of{' '}
          <span className="font-semibold text-slate-700">
            {new Intl.NumberFormat('en-US').format(total)}
          </span>
        </span>
      </div>

      {error && (
        <div className="px-5 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-200 flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Failed to load transactions: {error}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/70 text-slate-500">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Reference</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Type</th>
              <th className="text-right px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Amount</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Wilaya</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Latency</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Node</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">When</th>
              <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && txs.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-12">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>
                    Loading…
                  </div>
                </td>
              </tr>
            ) : txs.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-12">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-slate-400">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                      </svg>
                    </div>
                    <p className="text-sm">No transactions yet — click <strong>Generate</strong> above.</p>
                  </div>
                </td>
              </tr>
            ) : (
              txs.map((tx) => {
                const typeClass = TYPE_COLORS[tx.transaction_type] ?? 'bg-slate-50 text-slate-700 ring-slate-200';
                return (
                  <tr
                    key={tx.id}
                    className="border-t border-slate-100 hover:bg-brand-50/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{tx.reference}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide ring-1 ${typeClass}`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tx.wilaya_name ?? `#${tx.wilaya_id}`}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                          tx.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-rose-50 text-rose-700 ring-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {tx.status}
                      </span>
                      {tx.failure_reason && (
                        <span className="ml-2 text-xs text-slate-500">{tx.failure_reason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {tx.processing_latency_ms} ms
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{tx.node_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatTime(tx.transaction_date, tx.transaction_time)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(tx)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg px-2 py-1 transition"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TxDetailsModal tx={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
