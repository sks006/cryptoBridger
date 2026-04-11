/**
 * API client for Rust backend communication
 * Handles card swipe simulation, balance queries, and transaction management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface SwipeRequest {
  merchantName: string;
  merchantCategory: string;
  amount: number;
  currency: string;
  walletAddress: string;
}

export interface SwipeResponse {
  success: boolean;
  transactionId: string;
  approvedAmount: number;
  cashbackAmount: number;
  message: string;
  newBalance: number;
  txHash?: string;
}

export interface BalanceResponse {
  walletAddress: string;
  solBalance: number;
  usdcBalance: number;
  collateralValue: number;
  availableCredit: number;
  healthFactor: number;
}

export interface DepositRequest {
  walletAddress: string;
  amount: number; // in SOL
  signature: string;
}

export interface DepositResponse {
  success: boolean;
  txHash: string;
  newCollateralValue: number;
  newAvailableCredit: number;
}

// Mock API calls (replace with actual fetch calls to Rust backend)

export async function swipeCard(req: SwipeRequest): Promise<SwipeResponse> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800));

  const approved = req.amount <= 500;
  return {
    success: approved,
    transactionId: `TX${Date.now()}`,
    approvedAmount: approved ? req.amount : 0,
    cashbackAmount: approved ? req.amount * 0.02 : 0,
    message: approved ? "Transaction approved" : "Insufficient credit limit",
    newBalance: 2500 - (approved ? req.amount : 0),
    txHash: approved ? `${Math.random().toString(36).slice(2, 8)}...${Math.random().toString(36).slice(2, 6)}` : undefined,
  };
}

export async function getBalance(
  walletAddress: string
): Promise<BalanceResponse> {
  await new Promise((r) => setTimeout(r, 300));

  return {
    walletAddress,
    solBalance: 12.5482,
    usdcBalance: 2500.0,
    collateralValue: 12.5482 * 168.45,
    availableCredit: 1263.18,
    healthFactor: 1.78,
  };
}

export async function depositCollateral(
  req: DepositRequest
): Promise<DepositResponse> {
  await new Promise((r) => setTimeout(r, 1200));

  const newCollateralValue = req.amount * 168.45;
  return {
    success: true,
    txHash: `${Math.random().toString(36).slice(2, 8)}...${Math.random().toString(36).slice(2, 6)}`,
    newCollateralValue,
    newAvailableCredit: newCollateralValue * 0.8,
  };
}

export async function updateCardSettings(settings: {
  walletAddress: string;
  isFrozen?: boolean;
  spendingLimit?: number;
  mode?: "credit" | "debit";
}): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 400));
  return { success: true };
}

export { API_BASE_URL };
