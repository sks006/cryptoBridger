/**
 * Anchor program client for on-chain interactions
 * Manages collateral positions, credit lines, and card state
 */

export interface CollateralPosition {
  owner: string;
  collateralMint: string;
  collateralSymbol: string;
  collateralAmount: number;
  collateralUsdValue: number;
  borrowedAmount: number; // in USDC
  healthFactor: number; // >= 1.0 is safe, < 1.0 is liquidatable
  liquidationThreshold: number; // e.g. 0.80 = 80%
  ltv: number; // loan-to-value ratio
  maxBorrowable: number;
}

export interface CardState {
  isActive: boolean;
  isFrozen: boolean;
  spendingLimit: number; // daily limit in USD
  currentDaySpend: number;
  monthlySpend: number;
  cardNumber: string; // masked
  expiryDate: string;
  cvv: string; // masked
  mode: "credit" | "debit";
}

export interface Transaction {
  id: string;
  type: "purchase" | "topup" | "cashback" | "swap" | "interest";
  amount: number;
  currency: string;
  merchant?: string;
  description: string;
  timestamp: Date;
  status: "completed" | "pending" | "failed";
  txHash?: string;
}

// Mock program ID (replace with actual deployed program)
export const PROGRAM_ID = "Lamy7tY3CXv8PqNDvzmJK4qSuFbCJ7dWXNcRL5ZfEHm";

export function getMockCollateralPosition(): CollateralPosition {
  const collateralUsdValue = 12.5482 * 168.45;
  const borrowedAmount = 850.0;
  const healthFactor = (collateralUsdValue * 0.8) / borrowedAmount;

  return {
    owner: "8xK9mBzLpQRnVwT3cY7dFhJeN2sAuXiCvMoP4gS5tEq",
    collateralMint: "So11111111111111111111111111111111111111112",
    collateralSymbol: "SOL",
    collateralAmount: 12.5482,
    collateralUsdValue,
    borrowedAmount,
    healthFactor,
    liquidationThreshold: 0.8,
    ltv: borrowedAmount / collateralUsdValue,
    maxBorrowable: collateralUsdValue * 0.8 - borrowedAmount,
  };
}

export function getMockCardState(): CardState {
  return {
    isActive: true,
    isFrozen: false,
    spendingLimit: 1000,
    currentDaySpend: 234.5,
    monthlySpend: 1847.32,
    cardNumber: "**** **** **** 4291",
    expiryDate: "09/28",
    cvv: "***",
    mode: "credit",
  };
}

export function getMockTransactions(): Transaction[] {
  const now = new Date();
  return [
    {
      id: "tx_001",
      type: "purchase",
      amount: -45.99,
      currency: "USD",
      merchant: "Spotify",
      description: "Spotify Premium",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      status: "completed",
      txHash: "5KtFn...xR2m",
    },
    {
      id: "tx_002",
      type: "cashback",
      amount: 0.92,
      currency: "USD",
      description: "2% Cashback Reward",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      status: "completed",
    },
    {
      id: "tx_003",
      type: "purchase",
      amount: -128.5,
      currency: "USD",
      merchant: "Amazon",
      description: "Amazon Purchase",
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      status: "completed",
      txHash: "9mFwP...kL4v",
    },
    {
      id: "tx_004",
      type: "topup",
      amount: 500.0,
      currency: "USD",
      description: "SOL Collateral Deposit",
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: "completed",
      txHash: "3xNdQ...hY7p",
    },
    {
      id: "tx_005",
      type: "interest",
      amount: 1.24,
      currency: "USD",
      description: "Daily Interest Earned",
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: "completed",
    },
    {
      id: "tx_006",
      type: "purchase",
      amount: -59.99,
      currency: "USD",
      merchant: "Netflix",
      description: "Netflix Subscription",
      timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      status: "completed",
      txHash: "7rBkM...cF9z",
    },
    {
      id: "tx_007",
      type: "swap",
      amount: -200.0,
      currency: "USD",
      description: "SOL → USDC Swap",
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      status: "completed",
      txHash: "2vGpW...xS1n",
    },
  ];
}
