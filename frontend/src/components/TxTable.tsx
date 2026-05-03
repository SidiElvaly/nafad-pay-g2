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

function StatusPill({ status }: { status: 'SUCCESS' | 'FAILED' }) {
  const ok = status === 'SUCCESS';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
        ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {status}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] ?? 'bg-slate-50 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide ring-1 ${cls}`}>
      {type}
    </span>
  );
}

function ViewButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg px-2 py-1 transition"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
      </svg>
      View
    </button>
  );
}

const PAGE_SIZES = [25, 50, 100] as const;

export function TxTable() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = page * pageSize;

  useEffect(() => {
    let alive = true;
    const fetchTxs = async () => {
      try {
        const r = await api.listTransactions(pageSize, offset);
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
  }, [page, pageSize, offset]);

  // If `total` shrinks (or pageSize grows) such that the current page no
  // longer exists, snap back to the last valid page.
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const goFirst = () => setPage(0);
  const goLast = () => setPage(totalPages - 1);

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + txs.length, total);

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-card overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Recent transactions</h2>
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
            </span>
            2s
          </span>
        </div>
        <span className="text-xs sm:text-sm text-slate-500 tabular-nums">
          <span className="font-semibold text-slate-700">{rangeStart.toLocaleString()}</span>
          –
          <span className="font-semibold text-slate-700">{rangeEnd.toLocaleString()}</span>
          {' '}of{' '}
          <span className="font-semibold text-slate-700">{total.toLocaleString()}</span>
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

      {/* ---------- LOADING / EMPTY ---------- */}
      {loading && txs.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <div className="inline-flex items-center gap-2 text-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
            Loading…
          </div>
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center text-slate-400 py-12 px-4">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-slate-400">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              </svg>
            </div>
            <p className="text-sm">No transactions yet — click <strong>Generate</strong> above.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ---------- MOBILE / TABLET CARD VIEW (< md) ---------- */}
          <ul className="md:hidden divide-y divide-slate-100">
            {txs.map((tx) => (
              <li
                key={tx.id}
                className="px-4 py-3 active:bg-brand-50/60 transition-colors"
                onClick={() => setSelected(tx)}
                role="button"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <TypePill type={tx.transaction_type} />
                    <StatusPill status={tx.status} />
                  </div>
                  <div className="text-right tabular-nums font-semibold text-slate-900 text-sm whitespace-nowrap flex-shrink-0">
                    {formatAmount(tx.amount, tx.currency)}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-500 truncate">{tx.reference}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span className="text-slate-700">{tx.wilaya_name ?? `#${tx.wilaya_id}`}</span>
                  <span className="font-mono">{tx.node_id}</span>
                  <span className="tabular-nums">{tx.processing_latency_ms} ms</span>
                  <span className="ml-auto whitespace-nowrap">{formatTime(tx.transaction_date, tx.transaction_time)}</span>
                </div>
                {tx.failure_reason && (
                  <div className="mt-1 text-[11px] text-rose-600">{tx.failure_reason}</div>
                )}
              </li>
            ))}
          </ul>

          {/* ---------- TABLET / DESKTOP TABLE VIEW (md+) ---------- */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/70 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Reference</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Type</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Wilaya</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider hidden lg:table-cell">Latency</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider hidden lg:table-cell">Node</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider hidden xl:table-cell">When</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-t border-slate-100 hover:bg-brand-50/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{tx.reference}</td>
                    <td className="px-4 py-3"><TypePill type={tx.transaction_type} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tx.wilaya_name ?? `#${tx.wilaya_id}`}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={tx.status} />
                      {tx.failure_reason && (
                        <span className="ml-2 text-xs text-slate-500">{tx.failure_reason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 hidden lg:table-cell">
                      {tx.processing_latency_ms} ms
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 hidden lg:table-cell">{tx.node_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap hidden xl:table-cell">
                      {formatTime(tx.transaction_date, tx.transaction_time)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ViewButton onClick={() => setSelected(tx)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---------- PAGINATION FOOTER ---------- */}
      {!loading && total > 0 && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
            <span className="hidden sm:inline">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-600 tabular-nums">
            <PageBtn onClick={goFirst} disabled={page === 0} aria="First page">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M15.79 14.77a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L11.832 10l3.938 3.71a.75.75 0 01.02 1.06zm-6 0a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L5.832 10l3.938 3.71a.75.75 0 01.02 1.06z" clipRule="evenodd" />
              </svg>
            </PageBtn>
            <PageBtn onClick={goPrev} disabled={page === 0} aria="Previous page">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </PageBtn>
            <span className="px-2 sm:px-3 select-none">
              Page <span className="font-semibold text-slate-800">{page + 1}</span>
              <span className="text-slate-400"> / </span>
              <span className="font-semibold text-slate-800">{totalPages.toLocaleString()}</span>
            </span>
            <PageBtn onClick={goNext} disabled={page >= totalPages - 1} aria="Next page">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </PageBtn>
            <PageBtn onClick={goLast} disabled={page >= totalPages - 1} aria="Last page">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M4.21 5.23a.75.75 0 011.06-.02l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08L8.168 10 4.23 6.29a.75.75 0 01-.02-1.06zm6 0a.75.75 0 011.06-.02l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08L14.168 10l-3.938-3.71a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
              </svg>
            </PageBtn>
          </div>
        </div>
      )}

      <TxDetailsModal tx={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  aria,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  aria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-600 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}
