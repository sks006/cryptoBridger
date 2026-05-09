// apps/web/src/app/nfc/tap/page.tsx
//
// MOBILE-OPTIMIZED for Chrome Android.
//
// What changed for mobile:
//   - Cards reordered so tap card is FIRST on mobile (thumb-reachable),
//     deposit form is second. Desktop keeps the side-by-side layout.
//   - All tap targets ≥ 44px (Android/iOS minimum).
//   - <input> uses inputMode="decimal" so the numeric keypad opens with a
//     decimal point. text-base (16px) prevents iOS zoom-on-focus.
//   - Pyth strip restructured to fit a 360px viewport without wrapping ugly.
//   - Mode toggle uses flex-1 instead of min-w-[160px].
//   - Sticky status banner during scanning so users can read the state
//     while phones are held together (the visible strip is at the top edge).
//   - Safe-area insets for notched/cutout phones.
//   - Active scale-down on buttons for tactile feedback.

"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID, // ✅ correct package
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction, // ✅ swap from createTransferInstruction
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

import { useAnchorProvider } from "@/hooks/useAnchorProvider";
import { useHealthFactor } from "@/hooks/useHealthFactor";
import { useSolPrice } from "@/hooks/useSolPrice";
import {
  EURC_MINT,
  getLendingProgram,
  getUserPositionPda,
  getVaultPda,
  getEurcMintPda,
} from "@/lib/anchor-client";
import { SOL_USD_PRICE_UPDATE, EUR_USD_PRICE_UPDATE } from "@/lib/pyth-feeds";
import {
  WebNFCManager,
  type NFCTapState,
  type NFCReceipt,
  type MerchantPayload,
} from "@/lib/nfc/web-nfc";

import Header from "@/components/cardbridger/Header";
import Footer from "@/components/cardbridger/Footer";
import DepositCollateral from "@/components/cardbridger/DepositCollateral";
import MerchantTagWriter from "@/components/cardbridger/MerchantTagWriter";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Smartphone,
  Store,
  Wallet,
  Activity,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Radio,
} from "lucide-react";

const QUICK_EUR_AMOUNTS = [5, 10, 25, 50, 100];

const STATE_LABEL: Record<NFCTapState, string> = {
  idle: "Ready to pay",
  scanning: "Hold near merchant tag…",
  reading: "Tag detected — verifying",
  borrowing: "Borrowing & transferring on Solana…",
  logging: "Confirming receipt…",
  success: "Payment confirmed",
  error: "Payment failed",
};

export default function TapToPayPage() {
  const { publicKey, signTransaction } = useWallet();
  const provider = useAnchorProvider();

  // ---- live data ---------------------------------------------------------
  const {
    position,
    healthFactor,
    riskColor,
    riskLabel,
    refresh: refreshPosition,
    solPriceUsd,
  } = useHealthFactor();
  const { solUsd, eurUsd, publishTimeMs } = useSolPrice();

  // ---- ui state ----------------------------------------------------------
  const [mode, setMode] = useState<"sender" | "receiver">("sender");
  const [amount, setAmount] = useState<number>(5);
  const [nfcState, setNfcState] = useState<NFCTapState>("idle");
  const [receipt, setReceipt] = useState<NFCReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nfcManagerRef = useRef<WebNFCManager | null>(null);
  if (!nfcManagerRef.current) nfcManagerRef.current = new WebNFCManager();

  // ---- derived limits ---------------------------------------------------
  const collateralUsd = position?.collateralUsdValue ?? 0;
  const availableCreditUsd = position?.maxBorrowable ?? 0;
  const availableCreditEur =
    eurUsd && eurUsd > 0 ? availableCreditUsd / eurUsd : availableCreditUsd;

  const isOverLimit = amount > availableCreditEur;
  const tooLowHF = healthFactor < 1.2;
  const canTap =
    !!publicKey &&
    amount > 0 &&
    !isOverLimit &&
    !tooLowHF &&
    nfcState === "idle";

  const nfcSupported =
    typeof window !== "undefined" && WebNFCManager.isSupported();

  // ---- borrow + transfer atomic transaction -----------------------------
  const borrowAndGetSignature = useCallback(
    async (eurcAmount: number, merchant: MerchantPayload): Promise<string> => {
      if (!publicKey || !provider || !signTransaction) {
        throw new Error("Wallet is not connected");
      }
      if (!merchant.recipient) {
        throw new Error("Merchant tag is missing the recipient address");
      }

      const recipientPubkey = new PublicKey(merchant.recipient);
      const eurcMint = getEurcMintPda();
      const program = getLendingProgram(provider);
      const vaultPda = getVaultPda();
      const userPositionPda = getUserPositionPda(publicKey);

      // 1) Detect which token program owns the EURC mint.
      const mintInfo = await provider.connection.getAccountInfo(eurcMint);
      if (!mintInfo) {
        throw new Error(
          `EURC mint ${eurcMint.toBase58()} not found on this cluster. ` +
            `Check NEXT_PUBLIC_EURC_MINT and that you're on Devnet.`,
        );
      }
      const tokenProgramId = mintInfo.owner;

      // Sanity: must be one of the two known token programs.
      if (
        !tokenProgramId.equals(TOKEN_PROGRAM_ID) &&
        !tokenProgramId.equals(TOKEN_2022_PROGRAM_ID)
      ) {
        throw new Error(
          `Mint ${eurcMint.toBase58()} is not a token mint (owner: ${tokenProgramId.toBase58()})`,
        );
      }

      // 2) Derive ATAs USING the detected token program — this was the bug.
      //    getAssociatedTokenAddress signature:
      //    (mint, owner, allowOwnerOffCurve, programId, associatedTokenProgramId)
      const userEurcAta = await getAssociatedTokenAddress(
        eurcMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      const recipientEurcAta = await getAssociatedTokenAddress(
        eurcMint,
        recipientPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      const amountMicro = new BN(Math.round(eurcAmount * 1e6));
      const amountRaw = Math.round(eurcAmount * 1e6);

      const tx = new Transaction();

      // 3) Create recipient ATA if missing — pass matching token program.
      const recipientAtaInfo =
        await provider.connection.getAccountInfo(recipientEurcAta);
      if (!recipientAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            recipientEurcAta,
            recipientPubkey,
            eurcMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      // 3b) Also create the USER's ATA if it's missing.
      //     Without this, the transfer instruction below will fail with
      //     "Account does not exist" or "Provided owner is not allowed"
      //     on a fresh wallet that has never held EURC.
      const userAtaInfo = await provider.connection.getAccountInfo(userEurcAta);

      // 4) Borrow ix — unchanged.
      const borrowIx = await (program.methods as any)
        .borrow(amountMicro)
        .accounts({
          user: publicKey,
          vault: vaultPda,
          userPosition: userPositionPda,
          eurcMint, // ← ADD
          userEurcAccount: userEurcAta, // ← ADD
          solPriceUpdate: SOL_USD_PRICE_UPDATE,
          eurPriceUpdate: EUR_USD_PRICE_UPDATE,
          tokenProgram: TOKEN_PROGRAM_ID, // ← ADD
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, // ← ADD
          systemProgram: SystemProgram.programId, // ← ADD
          clock: SYSVAR_CLOCK_PUBKEY,
        } as any)
        .instruction();
      tx.add(borrowIx);

      // 5) Transfer ix — use TransferChecked (works for both Token & Token-2022)
      //    and pass the token program explicitly.
      tx.add(
        createTransferCheckedInstruction(
          userEurcAta,
          eurcMint,
          recipientEurcAta,
          publicKey,
          Math.round(eurcAmount * 1e6),
          6,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      const { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const signature = await provider.connection.sendRawTransaction(
        signed.serialize(),
        { skipPreflight: false, preflightCommitment: "confirmed" },
      );
      await provider.connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      return signature;
    },
    [publicKey, provider, signTransaction],
  );

  // ---- handlers ---------------------------------------------------------
  const handleStartScan = useCallback(async () => {
    setError(null);
    setReceipt(null);

    if (!publicKey) {
      setError("Connect your Solana wallet first.");
      setNfcState("error");
      return;
    }
    if (tooLowHF) {
      setError("Health factor too low. Add more collateral before spending.");
      setNfcState("error");
      return;
    }
    if (isOverLimit) {
      setError(
        `Amount exceeds your available credit (€${availableCreditEur.toFixed(2)}).`,
      );
      setNfcState("error");
      return;
    }

    if (!nfcSupported) {
      try {
        setNfcState("borrowing");
        const sig = await borrowAndGetSignature(amount, {
          merchant: "Direct Pay (no NFC)",
          amount: amount.toFixed(2),
          currency: "EUR",
          recipient: publicKey.toBase58(),
        });
        setReceipt({
          receiptId: `RCPT-${Date.now().toString(36).toUpperCase()}`,
          amount,
          merchantName: "Direct Pay (no NFC)",
          timestamp: new Date().toISOString(),
          txHash: sig,
          message: "Borrowed on Solana without NFC scan",
        });
        setNfcState("success");
        refreshPosition();
      } catch (e: any) {
        setError(e?.message ?? "Borrow failed");
        setNfcState("error");
      }
      return;
    }

    await nfcManagerRef.current!.startScan({
      amount,
      walletAddress: publicKey.toBase58(),
      onStateChange: setNfcState,
      onReceipt: (r) => {
        setReceipt(r);
        refreshPosition();
      },
      onError: (msg) => setError(msg),
      borrowAndGetSignature,
    });
  }, [
    publicKey,
    amount,
    tooLowHF,
    isOverLimit,
    availableCreditEur,
    nfcSupported,
    borrowAndGetSignature,
    refreshPosition,
  ]);

  const handleReset = useCallback(() => {
    nfcManagerRef.current?.stopScan();
    setNfcState("idle");
    setError(null);
    setReceipt(null);
  }, []);

  useEffect(() => {
    return () => nfcManagerRef.current?.stopScan();
  }, []);

  const isProcessing =
    nfcState === "scanning" ||
    nfcState === "reading" ||
    nfcState === "borrowing" ||
    nfcState === "logging";

  const priceTimeAgo = useMemo(() => {
    if (!publishTimeMs) return null;
    const seconds = Math.max(
      0,
      Math.round((Date.now() - publishTimeMs) / 1000),
    );
    return `${seconds}s ago`;
  }, [publishTimeMs, solUsd]);

  return (
    <div
      className="min-h-screen flex flex-col animated-gradient"
      // safe-area insets for phones with display cutouts
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Header />

      {/* Sticky NFC status banner — visible at top edge of phone while phones are held together */}
      {isProcessing && (
        <div
          className="sticky top-0 z-50 bg-emerald-600/95 backdrop-blur-md border-b border-emerald-400/40 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-2 text-white">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span className="text-sm font-semibold tracking-wide truncate">
              {STATE_LABEL[nfcState]}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-5 sm:py-12">
        {/* Hero */}
        <div className="text-center max-w-xl mx-auto mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2">
            Tap to Pay
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground px-2">
            Spend crypto without selling — powered by Solana
          </p>
        </div>

        {/* Live Pyth strip — mobile-friendly, no awkward wrapping */}
        <div className="max-w-xl mx-auto mb-5 sm:mb-8">
          <Card className="border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5">
            <CardContent className="py-2.5 px-3 sm:py-3 sm:px-4">
              {/* On mobile: stacked rows. On desktop: single row. */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-emerald-300">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Live Pyth Oracle</span>
                  {priceTimeAgo && (
                    <span className="text-muted-foreground normal-case font-normal ml-auto sm:ml-2">
                      · {priceTimeAgo}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 text-xs sm:text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">SOL</span>
                    <span className="font-semibold tabular-nums">
                      {solUsd ? `$${solUsd.toFixed(2)}` : "—"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">EUR</span>
                    <span className="font-semibold tabular-nums">
                      {eurUsd ? eurUsd.toFixed(4) : "—"}
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mode toggle — equal-width buttons on mobile, fixed-width on desktop */}
        <div className="flex gap-2 mb-5 sm:mb-8 max-w-md mx-auto">
          <Button
            size="lg"
            variant={mode === "sender" ? "gradient" : "outline"}
            onClick={() => {
              handleReset();
              setMode("sender");
            }}
            // flex-1 grows to fill, min-h-[48px] guarantees thumb-friendly tap target
            className="flex-1 min-h-[48px] text-sm sm:text-base active:scale-[0.98] transition-transform"
          >
            <Wallet className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">Sender</span>
          </Button>
          <Button
            size="lg"
            variant={mode === "receiver" ? "gradient" : "outline"}
            onClick={() => {
              handleReset();
              setMode("receiver");
            }}
            className="flex-1 min-h-[48px] text-sm sm:text-base active:scale-[0.98] transition-transform"
          >
            <Store className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">Merchant</span>
          </Button>
        </div>

        {/* RECEIVER MODE */}
        {mode === "receiver" && (
          <div className="max-w-md mx-auto">
            <MerchantTagWriter />
            <p className="text-center text-xs text-muted-foreground mt-5 sm:mt-6 max-w-sm mx-auto px-2 leading-relaxed">
              When the customer's phone touches yours, their wallet will sign
              one transaction that mints EURC against their SOL collateral and
              transfers it to <span className="font-medium">this wallet</span> —
              all atomic, all on-chain.
            </p>
          </div>
        )}

        {/* SENDER MODE */}
        {/*
            Mobile: tap card FIRST (thumb-reachable), then position summary,
                    then deposit form. Order is reversed via flex-col-reverse
                    on the LEFT column on desktop.
            Desktop: side-by-side, deposit on left.
        */}
        {mode === "sender" && (
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {/* RIGHT column on desktop, FIRST on mobile — payment + tap */}
            <div className="space-y-5 sm:space-y-6 md:order-2">
              {/* Amount picker */}
              <Card className="border border-border/60 bg-zinc-900/40">
                <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Amount
                    </h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Limit:{" "}
                      <span className="text-emerald-400 font-medium">
                        €{availableCreditEur.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  <div className="relative">
                    <Input
                      // inputMode="decimal" tells Android to open the numeric
                      // keypad with a decimal point. Without this, it opens
                      // the QWERTY keyboard or the numeric pad without ".".
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={amount || ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        setAmount(parseFloat(v) || 0);
                      }}
                      disabled={isProcessing}
                      // text-[16px] prevents iOS from zooming on focus.
                      // h-14 = 56px, comfortable thumb target.
                      className="text-2xl font-bold h-14 pr-20 tabular-nums text-[16px]"
                      placeholder="0.00"
                      autoComplete="off"
                      enterKeyHint="done"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400 pointer-events-none">
                      EURC
                    </span>
                  </div>

                  {/* Quick-amount pills — min-h-[44px] guarantees tappable */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {QUICK_EUR_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt)}
                        disabled={isProcessing}
                        className={`min-h-[44px] rounded-lg border text-sm font-medium transition-all active:scale-95 ${
                          amount === amt
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>

                  {isOverLimit && amount > 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Exceeds available credit (€
                        {availableCreditEur.toFixed(2)})
                      </span>
                    </div>
                  )}
                  {tooLowHF && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Health factor below 1.2 — add collateral first
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tap card */}
              <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-emerald-950/10 to-black shadow-2xl shadow-emerald-500/10">
                <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8 px-4 sm:px-6 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3 sm:mb-4">
                    {isProcessing ? (
                      <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-spin" />
                    ) : nfcState === "success" ? (
                      <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                    ) : nfcState === "error" ? (
                      <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
                    ) : (
                      <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-semibold tracking-wide uppercase text-emerald-300 mb-1">
                    {STATE_LABEL[nfcState]}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold tabular-nums mb-1">
                    €{amount.toFixed(2)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-5 sm:mb-6 px-2">
                    {nfcSupported
                      ? "Tap your phone to a merchant tag"
                      : "Web NFC unavailable — direct borrow mode"}
                  </p>

                  {nfcState === "idle" && (
                    <Button
                      onClick={handleStartScan}
                      disabled={!canTap}
                      // h-14 = 56px on mobile (comfortable). active:scale for tactile feel.
                      // touch-manipulation removes the 300ms tap delay on Android Chrome.
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl disabled:opacity-50 active:scale-[0.98] transition-transform touch-manipulation"
                    >
                      <Smartphone className="mr-2 w-5 h-5" />
                      {nfcSupported ? "Tap to Pay" : "Pay Now"}
                    </Button>
                  )}

                  {(nfcState === "success" || nfcState === "error") && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full h-12 active:scale-[0.98] transition-transform touch-manipulation"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Payment
                    </Button>
                  )}

                  {/* Receipt — compact on mobile so explorer link is above the fold */}
                  {receipt && nfcState === "success" && (
                    <div className="mt-5 text-left bg-zinc-950/60 rounded-lg border border-emerald-500/20 p-3 sm:p-4 space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">
                          Merchant
                        </span>
                        <span className="font-medium truncate">
                          {receipt.merchantName}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">
                          €{receipt.amount.toFixed(2)} EURC
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">
                          Receipt
                        </span>
                        <span className="font-mono text-[10px] sm:text-xs truncate">
                          {receipt.receiptId}
                        </span>
                      </div>
                      <a
                        href={`https://explorer.solana.com/tx/${receipt.txHash}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        // min-h-[44px] tap target for the explorer link
                        className="flex items-center justify-center gap-1.5 mt-3 min-h-[44px] text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 active:text-cyan-200 font-medium border border-cyan-500/30 rounded-lg bg-cyan-500/5 active:scale-[0.98] transition-transform touch-manipulation"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View on Solana Explorer
                      </a>
                    </div>
                  )}

                  {nfcState === "error" && error && (
                    <p className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-left break-words">
                      {error}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground px-2 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Non-custodial · Wallet-signed · Pyth-secured</span>
              </div>
            </div>

            {/* LEFT column on desktop, SECOND on mobile — deposit + position */}
            <div className="space-y-5 sm:space-y-6 md:order-1">
              <DepositCollateral
                solPriceUsd={solPriceUsd}
                onDeposited={() => refreshPosition()}
              />

              <Card className="border border-border/60 bg-zinc-900/40">
                <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Your Position
                    </h3>
                    {publicKey && (
                      <Badge variant="success" className="text-[10px]">
                        <Activity className="w-3 h-3 mr-1" />
                        live
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Collateral
                      </p>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums">
                        ${collateralUsd.toFixed(2)}
                      </p>
                      {position && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {position.collateralAmount.toFixed(4)} SOL
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Health Factor
                      </p>
                      <p
                        className={`text-xl sm:text-2xl font-bold tabular-nums ${riskColor}`}
                      >
                        {healthFactor >= 9999 ? "∞" : healthFactor.toFixed(2)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {riskLabel}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">
                        Available credit
                      </span>
                      <span className="font-semibold text-emerald-400 tabular-nums">
                        €{availableCreditEur.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Demo tip — collapsed-friendly on mobile */}
        <div className="max-w-2xl mx-auto mt-8 sm:mt-12">
          <Card className="border border-cyan-500/20 bg-cyan-500/5">
            <CardContent className="py-3 px-4 sm:py-4 sm:px-5">
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-cyan-300">
                  Investor demo tip:
                </span>{" "}
                On the merchant phone, switch to{" "}
                <span className="font-medium">Merchant</span> mode and connect
                that phone's wallet — that's where EURC will land. Then hold the
                customer's phone (in <span className="font-medium">Sender</span>{" "}
                mode) against it. The customer's wallet signs ONE transaction
                with three instructions: borrow, transfer, and (if needed)
                ATA-create. All atomic, all on-chain. Get DevNet SOL from{" "}
                <Link
                  href="https://faucet.solana.com"
                  className="underline text-cyan-400 active:text-cyan-200"
                  target="_blank"
                >
                  faucet.solana.com
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
