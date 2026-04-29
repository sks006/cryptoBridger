// apps/web/src/hooks/useNFCTap.ts
import { useState, useCallback } from "react";
import { getNonce, nfcTap } from "@/lib/api-client";
import { mockNFC } from "@/lib/nfc/mock-nfc";

export type NFCState = "idle" | "scanning" | "processing" | "success" | "error";

export function useNFCTap() {
  const [state, setState] = useState<NFCState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const isWebNFCSupported = typeof window !== "undefined" && "NDEFReader" in window;

  const startTap = useCallback(async (
    amount: number,
    walletAddress: string,
    healthFactor: number = 2.0
  ) => {
    // 1. Safety check
    if (healthFactor < 1.0) {
      setError("Health Factor too low. Add more collateral first.");
      setState("error");
      return;
    }

    setState("scanning");
    setError(null);

    try {
      // Step 1: Get fresh security nonce from backend
      const nonce = await getNonce();

      // Step 2: Simulate tap (real Web NFC on Android, mock on desktop/iOS)
      await simulateMockTap(amount, walletAddress, nonce);
    } catch (err: any) {
      setError(err.message || "Failed to start tap");
      setState("error");
    }
  }, []); // ← dependency array is empty because we don't depend on changing values

  // Mock tap simulation (used for demo on all devices)
  const simulateMockTap = async (amount: number, walletAddress: string, nonce: string) => {
    setState("processing");

    try {
      const mockResult = await mockNFC.simulateTap(1200); // 1.2 second realistic delay

      const response = await nfcTap({
        walletAddress,
        amount,
        deviceId: mockResult.serialNumber,
        nonce,
      });

      setReceipt(response);
      setState("success");
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setState("error");
    }
  };

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setReceipt(null);
  }, []);

  return {
    state,
    error,
    receipt,
    startTap,
    reset,
    isWebNFCSupported,
  };
}