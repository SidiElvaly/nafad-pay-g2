import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Stats } from '../types';

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

type Accent = 'brand' | 'success' | 'danger' | 'accent';

const ACCENTS: Record<Accent, { ring: string; text: string; bg: string }> = {
  brand:   { ring: 'ring-brand-100',   text: 'text-brand-700',    bg: 'bg-brand-50'   },
  accent:  { ring: 'ring-accent-400/20', text: 'text-accent-600', bg: 'bg-accent-400/10' },
  success: { ring: 'ring-emerald-100', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  danger:  { ring: 'ring-rose-100',    text: 'text-rose-700',    bg: 'bg-rose-50'    },
};

export function StatsBanner() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchStats = async () => {
      try {
        const s = await api.getStats();
        if (alive) {
          setStats(s);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const successAccent: Accent =
    stats && stats.success_rate > 0.5 ? 'success' : 'danger';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8">
      <Card
        label="Total transactions"
        value={stats ? formatNumber(stats.total_count) : '…'}
        accent="brand"
        icon={<IconStack />}
      />
      <Card
        label="Today's volume"
        value={stats ? formatNumber(stats.today_volume) : '…'}
        accent="accent"
        icon={<IconCalendar />}
      />
      <Card
        label="Success rate"
        value={stats ? `${(stats.success_rate * 100).toFixed(1)}%` : '…'}
        accent={successAccent}
        icon={<IconCheck />}
      />
      <Card
        label="Tx / second"
        value={stats ? stats.tx_per_second.toFixed(2) : '…'}
        accent="brand"
        icon={<IconBolt />}
        subLabel="last 60s"
      />
      {error && (
        <div className="sm:col-span-2 lg:col-span-4 text-sm text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200 flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          API unreachable: {error}
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  accent,
  icon,
  subLabel,
}: {
  label: string;
  value: string;
  accent: Accent;
  icon: React.ReactNode;
  subLabel?: string;
}) {
  const { ring, text, bg } = ACCENTS[accent];
  return (
    <div className={`group bg-white rounded-2xl ring-1 ${ring} p-3 sm:p-5 shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold leading-tight">
          {label}
        </div>
        <div className={`${bg} ${text} w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <div className={`mt-2 sm:mt-3 text-xl sm:text-3xl font-bold tabular-nums ${text}`}>{value}</div>
      {subLabel && (
        <div className="mt-1 text-[11px] text-slate-400 uppercase tracking-wider font-medium">
          {subLabel}
        </div>
      )}
    </div>
  );
}

const IconStack = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
    <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);
const IconBolt = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);
