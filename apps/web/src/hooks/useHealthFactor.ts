// apps/web/src/hooks/useHealthFactor.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorProvider } from "./useAnchorProvider";
import { fetchUserPosition, type CollateralPosition } from "@/lib/anchor-client";

export interface HealthFactorState {
  position: CollateralPosition | null;
  healthFactor: number;
  riskLevel: "safe" | "moderate" | "warning" | "critical";
  riskColor: string;
  riskLabel: string;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function getRiskLevel(hf: number) {
  if (hf >= 2.0) return { level: "safe", color: "text-emerald-400", label: "Safe" } as const;
  if (hf >= 1.5) return { level: "moderate", color: "text-cyan-400", label: "Moderate" } as const;
  if (hf >= 1.1) return { level: "warning", color: "text-yellow-400", label: "At Risk" } as const;
  return { level: "critical", color: "text-red-400", label: "Critical" } as const;
}

export function useHealthFactor(address?: string): HealthFactorState {
  const { publicKey: walletPublicKey } = useWallet();
  const provider = useAnchorProvider();
  const [position, setPosition] = useState<CollateralPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    const activeAddress = address || walletPublicKey?.toBase58();
    if (!activeAddress || !provider) return;
    setLoading(true);
    setError(null);
    try {
      const pubkey = new PublicKey(activeAddress);
      const pos = await fetchUserPosition(pubkey, provider);
      setPosition(pos);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [address, walletPublicKey?.toBase58(), provider]);

  useEffect(() => {
    fetchPosition();
    const interval = setInterval(fetchPosition, 30_000);
    return () => clearInterval(interval);
  }, [fetchPosition]);

  const healthFactor = position?.healthFactor ?? (walletPublicKey ? 9999 : 0);
  const risk = getRiskLevel(healthFactor);

  return {
    position,
    healthFactor,
    riskLevel: risk.level,
    riskColor: risk.color,
    riskLabel: risk.label,
    loading,
    error,
    refresh: fetchPosition,
  };
}