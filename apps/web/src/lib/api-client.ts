// apps/web/src/lib/api-client.ts
//
// All backend calls go through Next.js API routes (the proxy) so:
//   - BACKEND_URL stays server-side
//   - No CORS issues in production
//   - Same code path in dev and prod
//
// The proxy lives at:
//   GET  /api/nfc/nonce  → backend /nfc/nonce
//   POST /api/nfc/tap    → backend /nfc/tap

// ----- nonce -----------------------------------------------------------------

export async function getNonce(): Promise<string> {
  const res = await fetch("/api/nfc/nonce", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to get nonce (HTTP ${res.status})`);
  const data = (await res.json()) as { nonce?: string };
  if (!data.nonce) throw new Error("Backend returned an empty nonce");
  return data.nonce;
}

// ----- tap -------------------------------------------------------------------

export interface NfcTapParams {
  walletAddress: string;
  amount: number; // in EURC micro-units (already multiplied by 1e6)
  deviceId: string;
  nonce: string;
  txSignature: string;
  estimatedHealthFactor?: number;
  merchantData?: {
    merchant?: string;
    amount?: string;
    currency?: string;
    invoice?: string;
  };
}

export interface NfcTapResponse {
  success: boolean;
  receiptId: string;
  amount: number;
  txHash: string;
  merchantName: string;
  message: string;
  newHealthFactor: number;
  timestamp: string;
}

export async function nfcTap(params: NfcTapParams): Promise<NfcTapResponse> {
  const res = await fetch("/api/nfc/tap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet_address: params.walletAddress,
      amount: params.amount,
      device_id: params.deviceId,
      nonce: params.nonce,
      tx_signature: params.txSignature,
      estimated_health_factor: params.estimatedHealthFactor,
      merchant_data: params.merchantData,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || `Tap failed (HTTP ${res.status})`,
    );
  }

  return (await res.json()) as NfcTapResponse;
}