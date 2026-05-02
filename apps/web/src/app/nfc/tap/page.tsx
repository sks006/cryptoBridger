// apps/web/src/app/nfc/tap/page.tsx
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "../../../hooks/useAnchorProvider";
import { useHealthFactor } from "../../../hooks/useHealthFactor";
import { useSolPrice } from "../../../hooks/useSolPrice";
import {
  getLendingProgram,
  getVaultPda,
  getUserPositionPda,
  EURC_MINT,
  buildBorrowTransaction,
} from "../../../lib/anchor-client";
import { SOL_USD_PRICE_UPDATE, EUR_USD_PRICE_UPDATE } from "../../../lib/pyth-feeds";
import {
  WebNFCManager,
  type NFCTapState,
  type NFCReceipt,
  type MerchantPayload,
} from "../../../lib/nfc/web-nfc";

import Header from "../../../components/cardbridger/Header";
import Footer from "../../../components/cardbridger/Footer";
import DepositCollateral from "../../../components/cardbridger/DepositCollateral";
import MerchantTagWriter from "../../../components/cardbridger/MerchantTagWriter";

import {
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

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
  borrowing: "Borrowing EURC on Solana…",
  logging: "Confirming receipt…",
  success: "Payment confirmed",
  error: "Payment failed",
};

export default function NFCTapPage() {
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
  const { solUsd, eurUsd, solEur, publishTimeMs } = useSolPrice();

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
  // Convert the USD-denominated max borrow to EUR using live EUR/USD
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

  const borrowAndGetSignature = useCallback(
    async (
      eurcAmount: number,
      merchant: MerchantPayload,
    ): Promise<string> => {
      if (!publicKey || !provider || !signTransaction) {
        throw new Error("Wallet not connected");
      }
      if (!merchant.recipient) {
        throw new Error("Merchant tag is missing the recipient address");
      }

      const recipientPubkey = new PublicKey(merchant.recipient);
      const eurcMint = EURC_MINT;

      const program = getLendingProgram(provider);
      const vaultPda = getVaultPda();
      const userPositionPda = getUserPositionPda(publicKey);
      const userEurcAta = await getAssociatedTokenAddress(eurcMint, publicKey);

      const amountMicro = new BN(Math.round(eurcAmount * 1e6));

      const borrowIx = await (program.methods as any)
        .borrow(amountMicro)
        .accounts({
          user: publicKey,
          vault: vaultPda,
          userPosition: userPositionPda,
          eurcMint,
          userEurcAccount: userEurcAta,
          solPriceUpdate: SOL_USD_PRICE_UPDATE,
          eurPriceUpdate: EUR_USD_PRICE_UPDATE,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .instruction();

      const recipientEurcAta = await getAssociatedTokenAddress(
        eurcMint,
        recipientPubkey,
      );
      const recipientAtaInfo = await provider.connection.getAccountInfo(
        recipientEurcAta,
      );

      const tx = new Transaction();
      if (!recipientAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            recipientEurcAta,
            recipientPubkey,
            eurcMint,
          ),
        );
      }

      tx.add(borrowIx);
      tx.add(
        createTransferInstruction(
          userEurcAta,
          recipientEurcAta,
          publicKey,
          Math.round(eurcAmount * 1e6),
        ),
      );

      const { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const signature = await provider.connection.sendRawTransaction(
        signed.serialize(),
      );
      await provider.connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      return signature;
    },
    [publicKey, provider, signTransaction],
  );

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
      // Fallback: directly trigger the borrow with no tag (single-phone demo)
      try {
        setNfcState("borrowing");
        const sig = await borrowAndGetSignature(amount, {
          merchant: "Direct Pay (no NFC)",
          amount: amount.toFixed(2),
          currency: "EUR",
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

    // Real NFC scan path
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

  // Stop any in-flight scan if the user navigates away
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
    <div className="min-h-screen flex flex-col animated-gradient">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Tap to Pay
          </h1>
          <p className="text-muted-foreground">
            Spend crypto without selling — powered by Solana
          </p>
        </div>

        {/* Live Pyth strip — front-and-center proof that prices are real */}
        <div className="max-w-xl mx-auto mb-8">
          <Card className="border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5">
            <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live Pyth Oracle
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="text-muted-foreground">SOL/USD</span>{" "}
                  <span className="font-semibold tabular-nums">
                    {solUsd ? `$${solUsd.toFixed(2)}` : "—"}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">EUR/USD</span>{" "}
                  <span className="font-semibold tabular-nums">
                    {eurUsd ? eurUsd.toFixed(4) : "—"}
                  </span>
                </span>
                {priceTimeAgo && (
                  <span className="text-xs text-muted-foreground">
                    · updated {priceTimeAgo}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            size="lg"
            variant={mode === "sender" ? "gradient" : "outline"}
            onClick={() => {
              handleReset();
              setMode("sender");
            }}
            className="min-w-[160px]"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Sender (Pay)
          </Button>
          <Button
            size="lg"
            variant={mode === "receiver" ? "gradient" : "outline"}
            onClick={() => {
              handleReset();
              setMode("receiver");
            }}
            className="min-w-[160px]"
          >
            <Store className="w-4 h-4 mr-2" />
            Receiver (Merchant)
          </Button>
        </div>

        {/* ===== RECEIVER MODE ===== */}
        {mode === "receiver" && (
          <div className="max-w-md mx-auto">
            <MerchantTagWriter />
            <p className="text-center text-xs text-muted-foreground mt-6 max-w-sm mx-auto">
              When the customer's phone touches yours, their CardBridger app
              will read this request and execute a real{" "}
              <code className="text-emerald-400">borrow</code> instruction
              against the lending vault on Solana DevNet.
            </p>
          </div>
        )}

        {/* ===== SENDER MODE ===== */}
        {mode === "sender" && (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* LEFT — deposit + position */}
            <div className="space-y-6">
              <DepositCollateral
                solPriceUsd={solPriceUsd}
                onDeposited={() => refreshPosition()}
              />

              {/* Position summary card */}
              <Card className="border border-border/60 bg-zinc-900/40">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Your Position
                    </h3>
                    {publicKey && (
                      <Badge variant="success" className="text-[10px]">
                        <Activity className="w-3 h-3 mr-1" />
                        live
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Collateral
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        ${collateralUsd.toFixed(2)}
                      </p>
                      {position && (
                        <p className="text-xs text-muted-foreground">
                          {position.collateralAmount.toFixed(4)} SOL
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Health Factor
                      </p>
                      <p
                        className={`text-2xl font-bold tabular-nums ${riskColor}`}
                      >
                        {healthFactor >= 9999 ? "∞" : healthFactor.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {riskLabel}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <div className="flex justify-between text-sm">
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

            {/* RIGHT — payment + tap */}
            <div className="space-y-6">
              {/* Amount picker */}
              <Card className="border border-border/60 bg-zinc-900/40">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Amount
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Limit:{" "}
                      <span className="text-emerald-400 font-medium">
                        €{availableCreditEur.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount || ""}
                      onChange={(e) =>
                        setAmount(parseFloat(e.target.value) || 0)
                      }
                      disabled={isProcessing}
                      className="text-2xl font-bold h-14 pr-20 tabular-nums"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
                      EURC
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {QUICK_EUR_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt)}
                        disabled={isProcessing}
                        className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
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
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Exceeds available credit (€
                      {availableCreditEur.toFixed(2)})
                    </div>
                  )}
                  {tooLowHF && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Health factor below 1.2 — add collateral first
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tap card */}
              <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-emerald-950/10 to-black shadow-2xl shadow-emerald-500/10">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                    {isProcessing ? (
                      <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    ) : nfcState === "success" ? (
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    ) : nfcState === "error" ? (
                      <AlertCircle className="w-10 h-10 text-red-400" />
                    ) : (
                      <Radio className="w-10 h-10 text-emerald-400" />
                    )}
                  </div>

                  <p className="text-sm font-semibold tracking-wide uppercase text-emerald-300 mb-1">
                    {STATE_LABEL[nfcState]}
                  </p>
                  <p className="text-3xl font-extrabold tabular-nums mb-1">
                    €{amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    {nfcSupported
                      ? "Tap your phone to a merchant tag"
                      : "Web NFC unavailable — direct borrow mode"}
                  </p>

                  {nfcState === "idle" && (
                    <Button
                      onClick={handleStartScan}
                      disabled={!canTap}
                      size="xl"
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl disabled:opacity-50"
                    >
                      <Smartphone className="mr-2 w-5 h-5" />
                      {nfcSupported ? "Tap to Pay" : "Pay Now"}
                    </Button>
                  )}

                  {(nfcState === "success" || nfcState === "error") && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full h-12"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Payment
                    </Button>
                  )}

                  {/* Receipt */}
                  {receipt && nfcState === "success" && (
                    <div className="mt-6 text-left bg-zinc-950/60 rounded-lg border border-emerald-500/20 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Merchant</span>
                        <span className="font-medium">
                          {receipt.merchantName}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">
                          €{receipt.amount.toFixed(2)} EURC
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Receipt</span>
                        <span className="font-mono text-xs">
                          {receipt.receiptId}
                        </span>
                      </div>
                      <a
                        href={`https://explorer.solana.com/tx/${receipt.txHash}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View transaction on Solana Explorer
                      </a>
                    </div>
                  )}

                  {/* Error */}
                  {nfcState === "error" && error && (
                    <p className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      {error}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Trust footer */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Non-custodial · Wallet-signed · Pyth oracle-secured
              </div>
            </div>
          </div>
        )}

        {/* Demo helper card — visible in BOTH modes */}
        <div className="max-w-2xl mx-auto mt-12">
          <Card className="border border-cyan-500/20 bg-cyan-500/5">
            <CardContent className="py-4 px-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-cyan-300">
                  Investor demo tip:
                </span>{" "}
                On the merchant phone, switch to{" "}
                <span className="font-medium">Receiver (Merchant)</span>, write
                a tag with an amount, then hold the customer's phone (in{" "}
                <span className="font-medium">Sender (Pay)</span> mode) against
                it. The customer's wallet will sign a real{" "}
                <code className="text-emerald-400">borrow</code> instruction on
                Solana DevNet, and the receipt links straight to the tx on
                Solana Explorer. Get DevNet SOL from{" "}
                <Link
                  href="https://faucet.solana.com"
                  className="underline text-cyan-400"
                  target="_blank"
                >
                  faucet.solana.com
                </Link>{" "}
                and test EURC from{" "}
                <Link
                  href="https://faucet.circle.com"
                  className="underline text-cyan-400"
                  target="_blank"
                >
                  faucet.circle.com
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