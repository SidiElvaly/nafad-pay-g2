import { useState } from 'react';
import { BASE_URL } from './api';
import { BatchForm } from './components/BatchForm';
import { CreateTxModal } from './components/CreateTxModal';
import { StatsBanner } from './components/StatsBanner';
import { Toast, type ToastKind } from './components/Toast';
import { TxTable } from './components/TxTable';


export default function App() {
  const [toast, setToast] = useState<{ kind: ToastKind; msg: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  
  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/70 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-card flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path d="M4 7h16M4 12h10M4 17h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                NAFAD-PAY <span className="text-slate-400 font-medium hidden sm:inline">· Simulator</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-tight truncate">
                Group 2 · MRU mobile-money
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-dot" />
                <span className="relative rounded-full w-2 h-2 bg-emerald-500" />
              </span>
              Live
            </span>
            
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="New transaction"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white text-sm font-semibold px-3 sm:px-3.5 py-2 shadow-card hover:shadow-card-hover transition"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">New transaction</span>
              <span className="sm:hidden">New</span>
            </button>
            <a
              href={`${BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="API docs (Swagger)"
              title="API docs"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 font-semibold transition rounded-lg p-2 sm:px-2.5 sm:py-1.5"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-3.5 sm:h-3.5">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span className="hidden sm:inline">API docs</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8 animate-fade-in">
        <StatsBanner />
        <BatchForm
          onSuccess={(msg) => setToast({ kind: 'success', msg })}
          onError={(msg) => setToast({ kind: 'error', msg })}
        />
        <TxTable />
      </main>

      <CreateTxModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(tx) =>
          setToast({ kind: 'success', msg: `Transaction ${tx.reference} created (${tx.status})` })
        }
        
        onError={(msg) => setToast({ kind: 'error', msg })}
      />

      {toast && <Toast kind={toast.kind} message={toast.msg} onClose={() => setToast(null)} />}

      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-slate-500">
        SupNum NAFAD-PAY · seeded with 100 000 historical transactions
      </footer>
    </div>
  );
}
