// apps/web/src/app/nfc/tap/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { NFCTapButton } from "@/components/NFCTapButton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";

import { useWallet } from "@solana/wallet-adapter-react";
import { useHealthFactor } from "@/hooks/useHealthFactor";
import { useNFCTap } from "@/hooks/useNFCTap";

import { WebNFCManager } from "@/lib/nfc/web-nfc";
import { useAnchorProvider } from "@/hooks/useAnchorProvider";
import { buildDepositTransaction } from "@/lib/anchor-client";
import {
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import { Transaction, SystemProgram } from "@solana/web3.js";

export default function NFCTapPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const {
    position,
    healthFactor,
    loading: healthLoading,
    refresh: refreshHealth,
  } = useHealthFactor();
  const { state, error, receipt, startTap, reset } = useNFCTap();

  const provider = useAnchorProvider();
  const nfcManagerRef = useRef<WebNFCManager | null>(null);

  // Local State
  const [amount, setAmount] = useState<number>(5);
  const [mounted, setMounted] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Derived
  const collateralUsd = position?.collateralUsdValue || 0;
  const maxSpend = position?.maxBorrowable || 0;
  const isOverLimit = amount > maxSpend;
  const availableCreditPercent =
    collateralUsd > 0 ? Math.min((maxSpend / collateralUsd) * 100, 100) : 0;

  useEffect(() => {
    setMounted(true);
    if (!nfcManagerRef.current) {
      nfcManagerRef.current = new WebNFCManager();
    }
  }, []);

  // Auto-adjust amount
  useEffect(() => {
    if (amount > maxSpend && maxSpend > 0) {
      setAmount(Math.floor(maxSpend));
    }
  }, [maxSpend, amount]);

  const handleQuickAmount = (val: number) => {
    if (val <= maxSpend) setAmount(val);
  };

  // ==================== REAL NFC TAP HANDLER ====================
  const handleNfcTap = async () => {
    if (!publicKey || !provider || !signTransaction) {
      alert("Please connect your wallet");
      return;
    }
    if (amount <= 0 || isOverLimit) return;

    setScanning(true);

    try {
      await nfcManagerRef.current!.startScan({
        amount,
        walletAddress: publicKey.toBase58(),
        onStateChange: (newState) => {
          if (newState === "success" || newState === "error") {
            setScanning(false);
          }
        },
        onReceipt: (data) => {
          // Success path
          console.log("✅ NFC Payment Receipt:", data);
        },
        onError: (err) => {
          console.error("NFC Error:", err);
          setScanning(false);
        },
      });
    } catch (err: any) {
      console.error(err);
      setScanning(false);
    }
  };
  // ==================== DEPOSIT HANDLER ====================
  const handleDeposit = async () => {
    const solAmount = parseFloat(depositAmount);
    if (
      !solAmount ||
      solAmount <= 0 ||
      !publicKey ||
      !signTransaction ||
      !provider
    )
      return;

    setDepositLoading(true);
    setDepositError(null);
    setDepositSuccess(false);

    try {
      const depositTx = await buildDepositTransaction(
        publicKey,
        solAmount,
        provider,
      );

      const wSolAta = await getAssociatedTokenAddress(
        NATIVE_MINT,
        publicKey,
        false,
      );
      const accountInfo = await provider.connection.getAccountInfo(wSolAta);

      const tx = new Transaction();

      if (!accountInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            wSolAta,
            publicKey,
            NATIVE_MINT,
          ),
        );
      }

      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: wSolAta,
          lamports: solAmount * 1_000_000_000,
        }),
      );
      tx.add(createSyncNativeInstruction(wSolAta));
      tx.add(depositTx.instructions[0]);

      const { blockhash } =
        await provider.connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const signature = await provider.connection.sendRawTransaction(
        signed.serialize(),
      );

      // Confirm in background
      provider.connection
        .confirmTransaction(signature, "confirmed")
        .catch(console.error);

      setDepositSuccess(true);
      setDepositAmount("");

      // Refresh position
      refreshHealth?.();
      // cardBalance.refresh?.(); // uncomment if you have this hook
    } catch (err: any) {
      console.error(err);
      setDepositError(err.message || "Deposit failed");
    } finally {
      setDepositLoading(false);
    }
  };

  if (!mounted) return null;

  if (!connected || !publicKey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-background">
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">NFC Tap-to-Pay</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Solana wallet to start spending without selling your
            crypto.
          </p>
        </div>
      </main>
    );
  }

  if (healthLoading && !position) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-12 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-muted-foreground">Loading your position...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-background">
      <div className="text-center space-y-2 max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">Tap to Pay</h1>
        <p className="text-sm text-muted-foreground">
          Spend crypto without selling it — powered by Solana
        </p>
      </div>
      {/* === DEPOSIT COLLATERAL CARD === */}
      <Card className="relative w-full max-w-sm overflow-hidden border-zinc-800 bg-zinc-950 shadow-2xl transition-all duration-300 hover:shadow-emerald-500/20 group">
        {/* Decorative Top Glow Effect */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 transition-colors" />

        <CardContent className="relative pt-8 pb-8 space-y-6">
          {/* Header with improved spacing and accent */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-[0.2em]">
              Deposit Collateral
            </h3>
            <div className="h-1 w-12 rounded-full bg-zinc-800" />
          </div>

          <div className="space-y-4">
            {/* Input Section - Floating Label Style Look */}
            <div className="relative group">
              {/* Subtitle/Label for extra clarity */}
              <Input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={depositLoading}
                className={`
      h-16 text-2xl font-mono transition-all duration-200
      /* Text Colors - Forced Visibility */
      text-slate-50 placeholder:text-zinc-600
      /* Background & Border */
      bg-zinc-950 border-zinc-800 
      /* Focus States - High Contrast Emerald */
      focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
      /* Spacing */
      pl-4 pr-16
      /* Disabled State */
      disabled:opacity-50 disabled:cursor-not-allowed
    `}
                step="0.01"
              />

              {/* The Currency Badge - Increased Visibility */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <div className="h-6 w-[1px] bg-zinc-800 mx-1" />{" "}
                {/* Visual Separator */}
                <span className="font-black text-emerald-500 text-sm tracking-tighter">
                  SOL
                </span>
              </div>
            </div>

            {/* Button with Neon Glow and Scale Effect */}
            <Button
              variant="default"
              className="relative w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              onClick={handleDeposit}
              disabled={depositLoading || !depositAmount}
            >
              {depositLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                "Deposit Assets"
              )}
            </Button>

            {/* Status Messages with micro-animations */}
            <div className="min-h-[20px]">
              {depositError && (
                <p className="text-xs text-red-400 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {depositError}
                </p>
              )}
              {depositSuccess && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Transaction Confirmed
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Account Summary */}
      <Card className="w-full max-w-sm border-none bg-gradient-to-br from-zinc-900 to-black shadow-2xl shadow-emerald-500/10">
        <CardContent className="pt-6 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-semibold text-emerald-500/80 uppercase tracking-wider mb-1">
                Collateral Balance
              </p>
              <p className="text-3xl font-bold text-white tracking-tight">
                ${collateralUsd.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Health Factor
              </p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  healthFactor >= 2.0
                    ? "text-emerald-400"
                    : healthFactor >= 1.5
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {healthFactor > 100 ? "∞" : healthFactor.toFixed(2)}x
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-zinc-400">Available Credit</span>
              <span className="text-white">${maxSpend.toFixed(2)}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000"
                style={{ width: `${availableCreditPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amount Input + Quick Buttons */}
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
              Payment Amount
            </label>
            <span
              className={`text-xs font-mono transition-colors ${isOverLimit ? "text-red-400" : "text-zinc-500"}`}
            >
              Limit: €{maxSpend.toFixed(2)}
            </span>
          </div>

          {/* The Dynamic Input Container */}
          <div className="relative group">
            {/* Dynamic Glow Background */}
            <div
              className={`absolute -inset-1 rounded-xl bg-gradient-to-r ${isOverLimit ? "from-red-500/20 to-orange-500/20" : "from-emerald-500/20 to-zinc-500/10"} blur-lg opacity-100 transition-all`}
            />

            <div className="relative">
              <Input
                type="number"
                value={amount || ""}
                onChange={(e) =>
                  setAmount(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="0.00"
                className={`
            h-20 text-3xl font-mono transition-all duration-200
            /* Visibility & Contrast */
            text-slate-50 placeholder:text-zinc-700
            /* Background & Border */
            bg-zinc-950 border-zinc-800 
            /* Focus Logic */
            focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10
            /* Padding for the symbol */
            pl-6 pr-20
          `}
                step="0.01"
                min="0"
              />

              {/* Currency Badge with Separator - Matching Deposit Style */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
                <div className="h-8 w-[1px] bg-zinc-800" />
                <span className="font-black text-emerald-500 text-lg tracking-tighter">
                  EURC
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Selection Grid */}
        <div className="grid grid-cols-5 gap-2">
          {[5, 10, 15, 25, 50].map((val) => {
            const isSelected = amount === val;
            const isDisabled = val > maxSpend;

            return (
              <button
                key={val}
                onClick={() => handleQuickAmount(val)}
                disabled={isDisabled}
                className={`
            py-3 rounded-lg text-xs font-mono font-bold transition-all
            ${
              isSelected
                ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
            }
            ${isDisabled ? "opacity-20 cursor-not-allowed" : "active:scale-95"}
          `}
              >
                {val}
              </button>
            );
          })}
        </div>

        {/* Status Alert */}
        <div className="min-h-[60px]">
          {isOverLimit && (
            <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 p-4 rounded-xl animate-in fade-in zoom-in-95">
              <AlertCircle size={18} className="text-red-500" />
              <div className="flex flex-col">
                <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest">
                  Transaction Blocked
                </span>
                <span className="text-zinc-400 text-xs font-mono">
                  Exceeds €{maxSpend.toFixed(2)} limit
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* === REAL NFC TAP BUTTON === */}
      <NFCTapButton
        amount={amount}
        onTap={handleNfcTap} // ← Now triggers real NFC scan
        state={scanning ? "scanning" : state}
        error={error}
        receipt={receipt}
        onReset={reset}
        disabled={isOverLimit || amount <= 0}
      />

      <div className="text-center text-xs text-muted-foreground max-w-xs">
        Tap your phone on a merchant NFC tag to pay with borrowed EURC
      </div>
    </main>
  );
}
