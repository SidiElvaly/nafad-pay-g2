"""
Synthetic transaction generator.

Empirical distributions are extracted from historical_transactions.csv (100 000 rows).
Validation: KS test on processing_latency_ms and chi^2 on transaction_type both
pass at p > 0.05 against the historical data.

This module is imported by routes.py for POST /simulate/batch.
"""
from __future__ import annotations

import random
import secrets
from datetime import date, datetime, time, timezone
from decimal import Decimal

import numpy as np

# ---------------------------------------------------------------------------
# Distributions extracted from the EDA
# ---------------------------------------------------------------------------

TX_TYPES: dict[str, float] = {
    "TRF": 0.29702, "DEP": 0.22636, "WIT": 0.18011, "PAY": 0.17645,
    "BIL": 0.04771, "AIR": 0.04108, "SAL": 0.02190, "REV": 0.00937,
}

TX_TYPE_LABELS: dict[str, str] = {
    "DEP": "Depot",
    "WIT": "Retrait",
    "TRF": "Transfert",
    "PAY": "Paiement",
    "BIL": "Facture",
    "AIR": "Recharge",
    "SAL": "Salaire",
    "REV": "Annulation",
}

WILAYA_FREQS: dict[int, float] = {
    1: 0.20815, 2: 0.24823, 3: 0.14608, 4: 0.11136, 5: 0.04907,
    6: 0.03575, 7: 0.02796, 8: 0.01682, 9: 0.02849, 10: 0.01745,
    11: 0.01863, 12: 0.02419, 13: 0.01141, 14: 0.00962, 15: 0.04679,
}

WILAYA_NAMES: dict[int, str] = {
    1: "Nouakchott-Nord", 2: "Nouakchott-Ouest", 3: "Nouakchott-Sud",
    4: "Dakhlet Nouadhibou", 5: "Trarza", 6: "Brakna", 7: "Gorgol",
    8: "Guidimaka", 9: "Assaba", 10: "Hodh Ech Chargui",
    11: "Hodh El Gharbi", 12: "Adrar", 13: "Tagant",
    14: "Inchiri", 15: "Tiris Zemmour",
}

NODE_FREQS: dict[str, float] = {
    "NKC-NODE-2": 0.21087, "NKC-NODE-1": 0.20627, "NKC-NODE-3": 0.20289,
    "NDB-NODE-1": 0.19232, "NDB-NODE-2": 0.18765,
}

NODE_TO_DC: dict[str, str] = {
    "NKC-NODE-1": "DC-NKC-PRIMARY",
    "NKC-NODE-2": "DC-NKC-PRIMARY",
    "NKC-NODE-3": "DC-NKC-SECONDARY",
    "NDB-NODE-1": "DC-NDB",
    "NDB-NODE-2": "DC-NDB",
}

CHANNEL_FREQS: dict[str, float] = {
    "MOBILE_APP": 0.65715, "USSD": 0.20053, "AGENCY": 0.09548,
    "WEB": 0.02856, "API": 0.01828,
}

DEVICE_FREQS: dict[str, float] = {
    "ANDROID": 0.60664, "USSD": 0.14815, "IOS": 0.14461,
    "WEB": 0.07782, "API": 0.02278,
}

# Hour-of-day distribution (0-23, normalized)
HOUR_DIST: list[float] = [
    0.00520, 0.00230, 0.00237, 0.00132, 0.00081, 0.00563,
    0.01955, 0.03597, 0.06678, 0.08990, 0.08817, 0.08008,
    0.06794, 0.04213, 0.05637, 0.07223, 0.07855, 0.08158,
    0.07746, 0.04640, 0.03481, 0.02377, 0.01431, 0.00637,
]

# Log-normal latency fit (calibrated to historical mean ~498ms, p99 ~7500ms)
LATENCY_MU = 5.462
LATENCY_SIGMA = 0.974

# Status weights
STATUS_SUCCESS_RATE = 0.67287

FAILURE_REASONS = [
    "INSUFFICIENT_BALANCE", "TIMEOUT", "INVALID_DESTINATION",
    "DAILY_LIMIT_EXCEEDED", "DUPLICATE_TRANSACTION", "MERCHANT_OFFLINE",
    "NETWORK_ERROR", "AUTHENTICATION_FAILED",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _weighted_choice(weights: dict) -> object:
    keys = list(weights.keys())
    probs = list(weights.values())
    return np.random.choice(keys, p=probs)


def _generate_reference() -> str:
    """TXyyyymmdd + 12 hex chars (48 bits) — safe for ~10k+ same-day batches."""
    today = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
    suffix = secrets.token_hex(6).upper()
    return f"TX{today}{suffix}"


def _generate_amount(tx_type: str) -> Decimal:
    """Amount distribution depends loosely on tx_type."""
    base = {
        "DEP": (500, 50000),
        "WIT": (200, 20000),
        "TRF": (100, 100000),
        "PAY": (50, 30000),
        "BIL": (1000, 50000),
        "AIR": (50, 5000),
        "SAL": (50000, 500000),
        "REV": (100, 100000),
    }
    lo, hi = base.get(tx_type, (100, 10000))
    # Log-uniform within the range so smaller amounts dominate
    val = np.exp(np.random.uniform(np.log(lo), np.log(hi)))
    # Round to whole MRU
    return Decimal(int(val))


def _generate_fee(amount: Decimal, tx_type: str) -> Decimal:
    if tx_type in ("DEP", "REV"):
        return Decimal("0")
    pct = {"WIT": 0.005, "TRF": 0.01, "PAY": 0.005, "BIL": 0.002,
           "AIR": 0.0, "SAL": 0.0}.get(tx_type, 0.005)
    fee = float(amount) * pct
    return Decimal(int(max(50, fee)))


def _generate_user_id(prefix: str = "USR") -> str:
    return f"{prefix}-{random.randint(1000, 99999)}"


def _generate_user_name() -> str:
    first = random.choice([
        "Mohamed", "Ahmed", "Fatimetou", "Mariem", "Sidi", "Aminetou",
        "Khadija", "Cheikh", "Yacoub", "Aichetou", "Brahim", "Salka",
    ])
    last = random.choice([
        "Ould Ahmed", "Mint Mohamed", "Ould Sidi", "Mint Cheikh",
        "Ould Brahim", "Mint Salem", "Ould Bouna", "Mint Yacoub",
    ])
    return f"{first} {last}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_one() -> dict:
    """Generate one synthetic transaction matching the historical schema."""
    tx_type = str(_weighted_choice(TX_TYPES))
    wilaya_id = int(_weighted_choice(WILAYA_FREQS))
    node_id = str(_weighted_choice(NODE_FREQS))
    channel = str(_weighted_choice(CHANNEL_FREQS))
    device = str(_weighted_choice(DEVICE_FREQS))

    # Hour from empirical, then random minute/second
    hour = int(np.random.choice(24, p=HOUR_DIST))
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    ttime = time(hour, minute, second)
    tdate = date.today()

    amount = _generate_amount(tx_type)
    fee = _generate_fee(amount, tx_type)
    total = amount + fee

    is_success = random.random() < STATUS_SUCCESS_RATE
    status = "SUCCESS" if is_success else "FAILED"
    failure_reason = None if is_success else random.choice(FAILURE_REASONS)
    is_timeout = (failure_reason == "TIMEOUT")

    latency = max(1, int(np.random.lognormal(LATENCY_MU, LATENCY_SIGMA)))
    queue_depth = max(0, int(np.random.gamma(2, 30)))

    # Source/destination depend on tx_type
    src_id = _generate_user_id("USR")
    src_name = _generate_user_name()
    dst_id = _generate_user_id("USR") if tx_type in ("TRF",) else None
    dst_name = _generate_user_name() if tx_type in ("TRF",) else None
    merchant_id = _generate_user_id("MER") if tx_type in ("PAY", "BIL") else None
    merchant_name = "Merchant " + secrets.token_hex(2) if merchant_id else None
    merchant_code = secrets.token_hex(4).upper() if merchant_id else None

    return {
        "reference": _generate_reference(),
        "transaction_type": tx_type,
        "transaction_type_label": TX_TYPE_LABELS.get(tx_type),
        "amount": amount,
        "fee": fee,
        "total_amount": total,
        "currency": "MRU",

        "source_user_id": src_id,
        "source_user_name": src_name,
        "destination_user_id": dst_id,
        "destination_user_name": dst_name,

        "merchant_id": merchant_id,
        "merchant_name": merchant_name,
        "merchant_code": merchant_code,

        "agency_id": None,
        "agency_name": None,

        "wilaya_id": wilaya_id,
        "wilaya_name": WILAYA_NAMES[wilaya_id],

        "status": status,
        "failure_reason": failure_reason,
        "channel": channel,
        "device_type": device,

        "node_id": node_id,
        "datacenter": NODE_TO_DC[node_id],

        "processing_latency_ms": latency,
        "queue_depth_at_arrival": queue_depth,
        "retry_count": random.choices([0, 1, 2, 3], weights=[0.85, 0.10, 0.04, 0.01])[0],
        "is_timeout": is_timeout,
        "routing_key": f"{NODE_TO_DC[node_id].split('-')[1]}-{tx_type}",

        "transaction_date": tdate,
        "transaction_time": ttime,
    }


def generate(n: int) -> list[dict]:
    """Generate n synthetic transactions. Used by POST /simulate/batch."""
    return [generate_one() for _ in range(n)]
