"use client";

import { useState, useEffect, useCallback } from "react";
import { getMockCollateralPosition, type CollateralPosition } from "@/lib/anchor-client";

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

function getRiskLevel(hf: number): {
  level: "safe" | "moderate" | "warning" | "critical";
  color: string;
  label: string;
} {
  if (hf >= 2.0) return { level: "safe", color: "text-emerald-400", label: "Safe" };
  if (hf >= 1.5) return { level: "moderate", color: "text-cyan-400", label: "Moderate" };
  if (hf >= 1.1) return { level: "warning", color: "text-yellow-400", label: "At Risk" };
  return { level: "critical", color: "text-red-400", label: "Critical" };
}

export function useHealthFactor(walletAddress?: string): HealthFactorState {
  const [position, setPosition] = useState<CollateralPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));
      const pos = getMockCollateralPosition();
      setPosition(pos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch position");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPosition();
    // Poll every 30 seconds
    const interval = setInterval(fetchPosition, 30_000);
    return () => clearInterval(interval);
  }, [fetchPosition]);

  const healthFactor = position?.healthFactor ?? 0;
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
