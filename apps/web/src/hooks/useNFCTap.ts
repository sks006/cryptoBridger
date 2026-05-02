// apps/web/src/hooks/useNFCTap.ts
"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "./useAnchorProvider";
import { useHealthFactor } from "./useHealthFactor";
import { buildBorrowTransaction } from "@/lib/anchor-client";
import { SOL_USD_PRICE_UPDATE, EUR_USD_PRICE_UPDATE } from "@/lib/pyth-feeds";
import { nfcTap, getNonce } from "@/lib/api-client";

export type NFCState = "idle" | "scanning" | "processing" | "success" | "error";

export function useNFCTap() {
  const { publicKey, signTransaction } = useWallet(); // need signTransaction
  const provider = useAnchorProvider();
  const { healthFactor, position, refresh } = useHealthFactor();

  const [state, setState] = useState<NFCState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const startTap = useCallback(async (amountEurc: number) => {
    if (!publicKey || !provider || !signTransaction) {
      setError("Please connect your Solana wallet");
      setState("error");
      return;
    }

    if (healthFactor < 1.2) {
      setError("Health Factor too low. Add more collateral before spending.");
      setState("error");
      return;
    }

    const maxBorrow = position?.maxBorrowable || 0;
    if (amountEurc > maxBorrow) {
      setError(`You can only spend up to €${maxBorrow.toFixed(2)} based on your collateral.`);
      setState("error");
      return;
    }

    setState("processing");
    setError(null);

    try {
      // 1. Fetch one‑time nonce from backend
      const nonce = await getNonce();

      // 2. Build the borrow transaction
      const tx = await buildBorrowTransaction(
        publicKey,
        amountEurc,
        provider,
        SOL_USD_PRICE_UPDATE,
        EUR_USD_PRICE_UPDATE,
      );

      // 3. Sign with wallet (non‑custodial)
      const signedTx = await signTransaction(tx);

      // 4. Send to Solana network
      const signature = await provider.connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false, preflightCommitment: "confirmed" }
      );

      // 5. Wait for confirmation
      await provider.connection.confirmTransaction({
        signature,
        blockhash: signedTx.recentBlockhash!,
        lastValidBlockHeight: signedTx.lastValidBlockHeight!,
      }, "confirmed");

      // 6. Notify backend with the real tx signature
      const backendResponse = await nfcTap({
        walletAddress: publicKey.toBase58(),
        amount: amountEurc,
        deviceId: "web-nfc-demo",
        nonce,
        txSignature: signature,
        estimatedHealthFactor: healthFactor - 0.15, // rough estimate
      }).catch((e) => {
        console.warn("Backend logging failed (non‑blocking):", e);
        return {};
      });

      // 7. Build receipt for UI
      setReceipt({
        receiptId: `RCPT-${Date.now().toString(36).toUpperCase()}`,
        amount: amountEurc,
        merchantName: "Demo Terminal",
        timestamp: new Date().toISOString(),
        txHash: signature,
        newHealthFactor: healthFactor - 0.15,
        message: "Payment approved via Solana JIT borrow",
      });

      setState("success");

      // 8. Refresh on‑chain position
      refresh();
    } catch (err: any) {
      console.error("Tap failed:", err);
      setError(err.message || "Transaction failed. Please try again.");
      setState("error");
    }
  }, [publicKey, provider, signTransaction, healthFactor, position, refresh]);

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
  };
}