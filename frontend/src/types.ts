/** Mirrors api/app/schemas.py — keep in sync with api-contract.md */

export type TxStatus = 'SUCCESS' | 'FAILED';

export interface Transaction {
  id: number;
  reference: string;
  transaction_type: string;
  transaction_type_label: string | null;
  amount: string; // decimal as string to avoid JS float precision loss
  fee: string;
  total_amount: string;
  currency: string;
  source_user_id: string | null;
  source_user_name: string | null;
  destination_user_id: string | null;
  destination_user_name: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  wilaya_id: number;
  wilaya_name: string | null;
  status: TxStatus;
  failure_reason: string | null;
  channel: string | null;
  device_type: string | null;
  node_id: string;
  datacenter: string;
  processing_latency_ms: number;
  queue_depth_at_arrival: number;
  retry_count: number;
  is_timeout: boolean;
  transaction_date: string;
  transaction_time: string;
  created_at: string;
}

export interface TxListResponse {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface Stats {
  today_volume: number;
  success_rate: number;
  tx_per_second: number;
  total_count: number;
}

export interface BatchResult {
  generated: number;
  duration_ms: number;
}

export interface ApiError {
  detail: string;
  code?: string;
}
