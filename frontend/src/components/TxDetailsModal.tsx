import type { Transaction } from '../types';
import { Modal } from './Modal';

interface Props {
  tx: Transaction | null;
  onClose: () => void;
}

function formatAmount(s: string, currency: string): string {
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${currency}`;
}

export function TxDetailsModal({ tx, onClose }: Props) {
  return (
    <Modal
      open={tx !== null}
      onClose={onClose}
      title={tx ? `Transaction ${tx.reference}` : ''}
      subtitle={tx ? `id #${tx.id} · ${tx.transaction_type_label ?? tx.transaction_type}` : undefined}
      maxWidth="max-w-2xl"
    >
      {tx && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={tx.status} />
            {tx.is_timeout && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                TIMEOUT
              </span>
            )}
            {tx.retry_count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                {tx.retry_count} retries
              </span>
            )}
            {tx.failure_reason && (
              <span className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-full px-2 py-0.5 font-medium">
                {tx.failure_reason}
              </span>
            )}
          </div>

          <Section title="Amount">
            <Row label="Amount" value={formatAmount(tx.amount, tx.currency)} mono />
            <Row label="Fee" value={formatAmount(tx.fee, tx.currency)} mono />
            <Row label="Total" value={formatAmount(tx.total_amount, tx.currency)} bold mono />
          </Section>

          <Section title="Parties">
            <Row label="Source user" value={tx.source_user_name ?? '—'} sub={tx.source_user_id} />
            <Row label="Destination user" value={tx.destination_user_name ?? '—'} sub={tx.destination_user_id} />
            {tx.merchant_id && (
              <Row label="Merchant" value={tx.merchant_name ?? tx.merchant_id} sub={tx.merchant_id} />
            )}
          </Section>

          <Section title="Location & channel">
            <Row label="Wilaya" value={tx.wilaya_name ?? `#${tx.wilaya_id}`} sub={`id ${tx.wilaya_id}`} />
            <Row label="Channel" value={tx.channel ?? '—'} />
            <Row label="Device" value={tx.device_type ?? '—'} />
          </Section>

          <Section title="Routing & performance">
            <Row label="Node" value={tx.node_id} sub={tx.datacenter} mono />
            <Row label="Latency" value={`${tx.processing_latency_ms} ms`} mono />
            <Row label="Queue depth at arrival" value={String(tx.queue_depth_at_arrival)} mono />
          </Section>

          <Section title="Timing">
            <Row label="Transaction date" value={tx.transaction_date} mono />
            <Row label="Transaction time" value={tx.transaction_time} mono />
            <Row label="Created at" value={new Date(tx.created_at).toLocaleString()} sub={tx.created_at} />
          </Section>
        </div>
      )}
    </Modal>
  );
}

function StatusPill({ status }: { status: 'SUCCESS' | 'FAILED' }) {
  const ok = status === 'SUCCESS';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        ok
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {status}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
        {title}
      </div>
      <div className="rounded-xl ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  bold,
  mono,
}: {
  label: string;
  value: string;
  sub?: string | null;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-right ${bold ? 'font-bold text-slate-900' : 'text-slate-800'} ${mono ? 'font-mono text-sm tabular-nums' : 'text-sm'}`}>
        {value}
        {sub && <div className="text-[11px] text-slate-400 font-normal font-sans">{sub}</div>}
      </div>
    </div>
  );
}
