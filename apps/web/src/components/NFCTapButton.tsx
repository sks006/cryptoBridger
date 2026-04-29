// apps/web/src/components/NFCTapButton.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NFCRingAnimation } from "./NFCRingAnimation";
import {
  Smartphone,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface NFCTapButtonProps {
  amount: number;
  onTap: (amount: number) => Promise<void> | void;
  state: "idle" | "scanning" | "processing" | "success" | "error";
  error?: string | null;
  receipt?: any;
  onReset: () => void;
  disabled?: boolean;
}

const STATE_LABELS: Record<string, string> = {
  idle: "Contactless Payment",
  scanning: "Waiting for NFC tag…",
  processing: "Processing on Solana...",
  success: "Payment Successful",
  error: "Payment Failed",
};

export const NFCTapButton: React.FC<NFCTapButtonProps> = ({
  amount,
  onTap,
  state,
  error,
  receipt,
  onReset,
  disabled = false,
}) => {
  const isActive = state !== "idle";
  const canTap = state === "idle" && amount > 0 && !disabled;

  const handleTap = () => {
    if (canTap) {
      onTap(amount);        // Direct call - critical for future real Web NFC
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden border-2 border-border transition-all duration-300 hover:shadow-2xl dark:bg-zinc-900/50">
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          {STATE_LABELS[state] ?? "Tap to Pay"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {state === "idle" 
            ? "Powered by Solana • Instant JIT Borrow" 
            : "Real-time on-chain transaction"}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col items-center py-10">
        {/* Main Animation */}
        <NFCRingAnimation 
          active={isActive} 
          status={state} 
          className="mb-8" 
        />

        {/* Amount Display */}
        <div className="text-center space-y-3 mb-6">
          <div className="text-5xl font-extrabold tracking-tighter text-white">
            €{amount.toFixed(2)}
          </div>
          <p className="text-sm font-medium text-muted-foreground">EURC</p>

          {/* Success State */}
          {state === "success" && receipt && (
            <div className="flex flex-col items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
              <p className="font-semibold">Transaction Confirmed</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Receipt ID: {receipt.receiptId}</div>
                {receipt.txHash && (
                  <a 
                    href={`https://solscan.io/tx/${receipt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    View on Solscan →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />
              {error || "Payment could not be completed"}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pb-6">
        {/* Idle State - Main Action Button */}
        {state === "idle" && (
          <Button
            onClick={handleTap}
            disabled={!canTap}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.985]"
          >
            <Smartphone className="mr-3 h-6 w-6" />
            Tap to Pay
          </Button>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="w-full py-4 flex items-center justify-center gap-3 text-amber-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Borrowing EURC &amp; Processing...</span>
          </div>
        )}

        {/* Scanning State (if you implement real Web NFC later) */}
        {state === "scanning" && (
          <p className="w-full text-center py-4 text-sm font-medium text-muted-foreground animate-pulse">
            Hold near terminal...
          </p>
        )}

        {/* Reset Button for Success / Error */}
        {(state === "success" || state === "error") && (
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full h-12 text-base"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Payment
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};