"use client";

import { useState, useEffect, useCallback } from "react";
import { getBalance, type BalanceResponse } from "@/lib/api-client";
import { getMockTokenBalances, type TokenBalance } from "@/lib/solana";

export interface CardBalanceState {
  balance: BalanceResponse | null;
  tokens: TokenBalance[];
  totalPortfolioUsd: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCardBalance(walletAddress?: string): CardBalanceState {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    // Safety check: Don't fetch if wallet is not connected or address is missing
    if (!walletAddress || walletAddress === "8xK9mBzLpQRnVwT3cY7dFhJeN2sAuXiCvMoP4gS5tEq") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [bal, tok] = await Promise.all([
        getBalance(walletAddress).catch(() => ({ balance: 0, availableCredit: 0 })),
        Promise.resolve(getMockTokenBalances()),
      ]);
      setBalance(bal);
      setTokens(tok);
    } catch (e) {
      console.warn("Silent balance fetch failure:", e);
      // Don't set error state to keep UI clean during transitions
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const totalPortfolioUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);

  return {
    balance,
    tokens,
    totalPortfolioUsd,
    loading,
    error,
    refresh: fetchBalance,
  };
}
