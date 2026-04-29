// apps/web/src/hooks/useCardState.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "./useAnchorProvider";
import { fetchUserPosition } from "@/lib/anchor-client";
import { shortenAddress } from "@/lib/utils";

export interface DynamicCardState {
  cardNumber: string;
  mode: "credit" | "debit";
  availableCredit: number;
  totalCollateral: number;
  healthFactor: number;
  isFrozen: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCardState(): DynamicCardState {
  const { publicKey, connected } = useWallet();
  const provider = useAnchorProvider();
  const [state, setState] = useState<DynamicCardState>({
    cardNumber: "Connect Wallet",
    mode: "credit",
    availableCredit: 0,
    totalCollateral: 0,
    healthFactor: 0,
    isFrozen: false,
    isLoading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!connected || !publicKey || !provider) {
      setState(s => ({
        ...s,
        cardNumber: "Connect Wallet",
        isLoading: false,
        availableCredit: 0,
      }));
      return;
    }

    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const pos = await fetchUserPosition(publicKey, provider);
      if (pos) {
        setState({
          cardNumber: shortenAddress(publicKey.toBase58()),
          mode: pos.borrowedAmount > 0 ? "credit" : "debit",
          availableCredit: pos.maxBorrowable,
          totalCollateral: pos.collateralUsdValue,
          healthFactor: pos.healthFactor,
          isFrozen: false, // we could add a real flag later
          isLoading: false,
          error: null,
        });
      } else {
        // no position yet, show zeroed state
        setState(s => ({
          ...s,
          cardNumber: shortenAddress(publicKey.toBase58()),
          mode: "debit",
          availableCredit: 0,
          totalCollateral: 0,
          healthFactor: 0,
          isLoading: false,
          error: null,
        }));
      }
    } catch (e: any) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: e.message || "Failed to load card data",
      }));
    }
  }, [connected, publicKey, provider]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...state, refresh };
}