// apps/web/src/hooks/useNFCTap.ts
"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "./useAnchorProvider";
import { useHealthFactor } from "./useHealthFactor";
import { buildBorrowTransaction } from "@/lib/anchor-client";
import { SOL_USD_PRICE_UPDATE, EUR_USD_PRICE_UPDATE } from "@/lib/pyth-feeds";
import { nfcTap } from "@/lib/api-client";

export type NFCState = "idle" | "scanning" | "processing" | "success" | "error";

export function useNFCTap() {
  const { publicKey } = useWallet();
  const provider = useAnchorProvider();
  const { healthFactor, position, refresh } = useHealthFactor();

  const [state, setState] = useState<NFCState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any>(null);

  const startTap = useCallback(async (amountEurc: number) => {
    if (!publicKey || !provider) {
      setError("Please connect your Solana wallet");
      setState("error");
      return;
    }

    // Safety checks using real on-chain data
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
      // 1. Real on-chain borrow (JIT)
      const tx = await buildBorrowTransaction(
        publicKey,
        amountEurc,
        provider,
        SOL_USD_PRICE_UPDATE,
        EUR_USD_PRICE_UPDATE
      );

      // Sign and send
      const signedTx = await provider.wallet.signTransaction!(tx);
      const txid = await provider.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
      });

      // Wait for confirmation
      await provider.connection.confirmTransaction({
        signature: txid,
        blockhash: (await provider.connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: (await provider.connection.getLatestBlockhash()).lastValidBlockHeight,
      }, "confirmed");

      // 2. Optional: Notify backend for logging / receipt
      const backendResponse = await nfcTap({
        walletAddress: publicKey.toBase58(),
        amount: amountEurc,
        deviceId: "web-nfc-demo",
        nonce: Date.now().toString(),
      }).catch(() => ({})); // Don't fail the whole tap if backend is down

      // 3. Create nice receipt for UI
      setReceipt({
        receiptId: `RCPT-${Date.now().toString(36).toUpperCase()}`,
        amount: amountEurc,
        merchantName: "Demo Terminal",
        timestamp: new Date().toISOString(),
        txHash: txid,
        newHealthFactor: Math.max(1.1, (healthFactor - 0.25)),
        message: "Payment approved via Solana JIT borrow",
      });

      setState("success");

      // Refresh health factor and balance
      refresh();
    } catch (err: any) {
      console.error("Tap failed:", err);
      setError(err.message || "Transaction failed. Please try again.");
      setState("error");
    }
  }, [publicKey, provider, healthFactor, position, refresh]);

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