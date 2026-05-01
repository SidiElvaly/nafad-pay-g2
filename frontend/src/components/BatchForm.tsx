import { useState } from 'react';
import { api, ApiError } from '../api';

interface Props {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

const QUICK_PICKS = [10, 100, 1000, 10000];

export function BatchForm({ onSuccess, onError }: Props) {
  const [n, setN] = useState(100);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.simulateBatch(n);
      onSuccess(`Generated ${r.generated} transactions in ${r.duration_ms} ms`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      onError(`Batch failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 shadow-card mb-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Generate synthetic transactions</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Bulk-inserts via{' '}
            <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">
              POST /simulate/batch
            </code>{' '}
            using empirical distributions.
          </p>
        </div>
        <div className="hidden md:flex w-9 h-9 rounded-xl bg-brand-50 text-brand-600 items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="batch-n" className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            Number of transactions
          </label>
          <input
            id="batch-n"
            type="number"
            min={1}
            max={10000}
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_PICKS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setN(q)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                  n === q
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {q.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold px-5 py-2.5 transition shadow-card hover:shadow-card-hover"
        >
          {loading ? (
            <>
              <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              Generate {n.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
