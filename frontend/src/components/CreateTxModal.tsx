import { useState } from 'react';
import { api, ApiError } from '../api';
import type { Transaction } from '../types';
import { Modal } from './Modal';

const TX_TYPES: { value: string; label: string }[] = [
  { value: 'TRF', label: 'TRF — Transfer' },
  { value: 'DEP', label: 'DEP — Deposit' },
  { value: 'WIT', label: 'WIT — Withdrawal' },
  { value: 'PAY', label: 'PAY — Payment' },
  { value: 'BIL', label: 'BIL — Bill payment' },
  { value: 'AIR', label: 'AIR — Airtime top-up' },
  { value: 'SAL', label: 'SAL — Salary' },
  { value: 'REV', label: 'REV — Reversal' },
];

const WILAYAS: { id: number; name: string }[] = [
  { id: 1,  name: 'Nouakchott-Nord' },
  { id: 2,  name: 'Nouakchott-Ouest' },
  { id: 3,  name: 'Nouakchott-Sud' },
  { id: 4,  name: 'Dakhlet Nouadhibou' },
  { id: 5,  name: 'Trarza' },
  { id: 6,  name: 'Brakna' },
  { id: 7,  name: 'Gorgol' },
  { id: 8,  name: 'Guidimaka' },
  { id: 9,  name: 'Assaba' },
  { id: 10, name: 'Hodh Ech Chargui' },
  { id: 11, name: 'Hodh El Gharbi' },
  { id: 12, name: 'Adrar' },
  { id: 13, name: 'Tagant' },
  { id: 14, name: 'Inchiri' },
  { id: 15, name: 'Tiris Zemmour' },
];

const CHANNELS = ['MOBILE_APP', 'USSD', 'AGENCY', 'WEB', 'API'] as const;
const DEVICES = ['ANDROID', 'IOS', 'USSD', 'WEB', 'API'] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (tx: Transaction) => void;
  onError: (msg: string) => void;
}

export function CreateTxModal({ open, onClose, onSuccess, onError }: Props) {
  const [transactionType, setTransactionType] = useState('TRF');
  const [amount, setAmount] = useState('1000');
  const [fee, setFee] = useState('50');
  const [wilayaId, setWilayaId] = useState(1);
  const [sourceName, setSourceName] = useState('');
  const [destName, setDestName] = useState('');
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('MOBILE_APP');
  const [device, setDevice] = useState<(typeof DEVICES)[number]>('ANDROID');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTransactionType('TRF');
    setAmount('1000');
    setFee('50');
    setWilayaId(1);
    setSourceName('');
    setDestName('');
    setChannel('MOBILE_APP');
    setDevice('ANDROID');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const wilaya = WILAYAS.find((w) => w.id === wilayaId);
      const tx = await api.createTransaction({
        transaction_type: transactionType,
        amount,
        fee,
        currency: 'MRU',
        wilaya_id: wilayaId,
        wilaya_name: wilaya?.name,
        source_user_name: sourceName || undefined,
        destination_user_name: destName || undefined,
        channel,
        device_type: device,
      } as Partial<Transaction>);
      onSuccess(tx);
      reset();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      onError(`Create failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!submitting) onClose(); }}
      title="New transaction"
      subtitle="Calls POST /transactions with a fresh Idempotency-Key."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={submit} className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Transaction type" htmlFor="tx-type">
            <select
              id="tx-type"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className={selectCls}
            >
              {TX_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Wilaya" htmlFor="wilaya">
            <select
              id="wilaya"
              value={wilayaId}
              onChange={(e) => setWilayaId(Number(e.target.value))}
              className={selectCls}
            >
              {WILAYAS.map((w) => (
                <option key={w.id} value={w.id}>{w.id}. {w.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Amount (MRU)" htmlFor="amount">
            <input
              id="amount"
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className={inputCls}
            />
          </Field>

          <Field label="Fee (MRU)" htmlFor="fee">
            <input
              id="fee"
              type="number"
              min={0}
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Source user name" htmlFor="src">
            <input
              id="src"
              type="text"
              maxLength={128}
              placeholder="optional"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Destination user name" htmlFor="dst">
            <input
              id="dst"
              type="text"
              maxLength={128}
              placeholder="optional"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Channel" htmlFor="channel">
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as (typeof CHANNELS)[number])}
              className={selectCls}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Device" htmlFor="device">
            <select
              id="device"
              value={device}
              onChange={(e) => setDevice(e.target.value as (typeof DEVICES)[number])}
              className={selectCls}
            >
              {DEVICES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold px-5 py-2 transition shadow-card hover:shadow-card-hover"
          >
            {submitting ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition';
const selectCls = inputCls + ' bg-white';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
