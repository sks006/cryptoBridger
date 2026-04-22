// apps/web/src/lib/api-client.ts

// Fetch backend URL from environment, with fallback for local development
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

// Validate that we have a URL (optional but helpful for debugging)
if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
  console.warn("⚠️ NEXT_PUBLIC_BACKEND_URL not set. Using fallback: http://localhost:8080");
} else {
  console.log(`✅ Backend URL configured: ${BACKEND_URL}`);
}

// Get fresh nonce before every tap
export async function getNonce(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/nfc/nonce`);
  if (!res.ok) throw new Error("Failed to get nonce");
  const data = await res.json();
  return data.nonce;
}

// Main tap function - called by useNFCTap
export async function nfcTap(params: {
  walletAddress: string;
  amount: number;
  deviceId: string;
  nonce: string;
}) {
  const res = await fetch(`${BACKEND_URL}/nfc/tap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet_address: params.walletAddress,
      amount: params.amount,
      device_id: params.deviceId,
      nonce: params.nonce,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Tap failed");
  }

  return res.json();
}

// ==================== NEW FUNCTIONS ====================

export interface BalanceResponse {
  balance: number;
  availableCredit: number;
}

/**
 * Fetch the current card balance for a wallet
 */
export async function getBalance(walletAddress: string): Promise<BalanceResponse> {
  try {
    // The backend route is currently commented out in main.rs, 
    // so we'll use a try-catch to avoid breaking the UI
    const res = await fetch(`${BACKEND_URL}/card/balance?address=${walletAddress}`);
    if (!res.ok) throw new Error("Backend route not active");
    return res.json();
  } catch (e) {
    // Fallback mock balance for demo if backend isn't ready
    return { 
      balance: 1250.50,
      availableCredit: 1250.50 
    };
  }
}

/**
 * Update card settings (Freeze, Limits, Mode)
 */
export async function updateCardSettings(params: {
  walletAddress: string;
  isFrozen?: boolean;
  mode?: "credit" | "debit";
  spendingLimit?: number;
}) {
  console.log("Updating card settings on backend:", params);
  
  // For the MVP demo, we'll simulate a successful update
  await new Promise(r => setTimeout(r, 500));
  return { success: true, updated: params };
}

/**
 * Deposit SOL collateral to the lending vault
 */
export async function depositCollateral(params: {
  walletAddress: string;
  amount: number;
  signature: string;
}) {
  console.log("Processing collateral deposit:", params);
  
  // Simulate backend processing
  await new Promise(r => setTimeout(r, 1000));
  
  return {
    success: true,
    txHash: params.signature || "mock_tx_" + Math.random().toString(36).substring(7),
    newAvailableCredit: 2500.0, // Mocked increase
  };
}

/**
 * Interface for the POS Simulator response
 */
export interface SwipeResponse {
  success: boolean;
  message: string;
  transactionId: string;
  approvedAmount: number;
  cashbackAmount: number;
  newBalance: number;
  txHash?: string;
}

/**
 * Simulate a physical card swipe or online purchase
 */
export async function swipeCard(params: {
  merchantName: string;
  merchantCategory: string;
  amount: number;
  currency: string;
  walletAddress: string;
}): Promise<SwipeResponse> {
  console.log("Processing swipe at merchant:", params.merchantName);
  
  // Simulate network/blockchain delay
  await new Promise(r => setTimeout(r, 1200));

  // For the MVP demo, we'll auto-approve if amount < 2000
  const isApproved = params.amount < 2000;
  const cashbackRate = 0.02; // 2% for MVP
  const cashbackAmount = params.amount * cashbackRate;

  if (!isApproved) {
    return {
      success: false,
      message: "Declined: Insufficient Credit Line",
      transactionId: "FAILED",
      approvedAmount: 0,
      cashbackAmount: 0,
      newBalance: 2500.0,
    };
  }

  return {
    success: true,
    message: `Approved at ${params.merchantName}`,
    transactionId: "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
    approvedAmount: params.amount,
    cashbackAmount: cashbackAmount,
    newBalance: 2500.0 - params.amount + cashbackAmount,
    txHash: "57kPkY..." + Math.random().toString(36).substring(2, 5),
  };
}