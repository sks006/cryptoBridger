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
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const [bal, tok] = await Promise.all([
        getBalance(walletAddress),
        Promise.resolve(getMockTokenBalances()),
      ]);
      setBalance(bal);
      setTokens(tok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch balance");
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
