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
import { useNFCTap } from "@/hooks/useNFCTap";
import { NFCRingAnimation } from "./NFCRingAnimation";
import {
  Smartphone,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface NFCTapButtonProps {
  amount: number;
  walletAddress: string;
  healthFactor?: number;
}

const STATE_LABELS: Record<string, string> = {
  idle: "Contactless Payment",
  scanning: "Waiting for NFC tag…",
  processing: "Processing payment…",
  success: "Payment Complete",
  error: "Payment Failed",
};

export const NFCTapButton: React.FC<NFCTapButtonProps> = ({
  amount,
  walletAddress,
  healthFactor,
}) => {
  const { state, error, receipt, startTap, reset, isWebNFCSupported } =
    useNFCTap();

  /**
   * CRITICAL: handleTap must be the direct onClick handler.
   * Do NOT wrap in setTimeout / async-before-startTap.
   * Web NFC requires NDEFReader.scan() to be called while a user gesture
   * is still active in the call stack — any async gap breaks it.
   */
  const handleTap = () => {
    startTap(amount, walletAddress, healthFactor);
  };

  const isActive = state !== "idle";
  const canTap = state === "idle" && amount > 0 && Boolean(walletAddress);

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden border-2 transition-all duration-300 hover:shadow-xl dark:bg-zinc-900/50">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl font-bold tracking-tight">
          {STATE_LABELS[state] ?? "Payment"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isWebNFCSupported
            ? "Hold phone near the NFC terminal"
            : "Simulated NFC — no hardware required"}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col items-center py-8">
        {/* Ring animation — status maps 1:1 to state */}
        <NFCRingAnimation active={isActive} status={state} className="mb-6" />

        {/* Amount */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-extrabold">
            ${amount.toFixed(2)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              USDC
            </span>
          </div>

          {state === "success" && receipt && (
            <div className="flex items-center justify-center gap-2 text-emerald-500 font-medium text-sm">
              <CheckCircle2 size={16} />
              Paid to {receipt.merchantName}
            </div>
          )}

          {state === "success" && receipt && (
            <div className="text-xs text-muted-foreground space-y-1 mt-2 text-center">
              <div>Receipt: {receipt.receiptId}</div>
              <div>
                Health factor after:{" "}
                <span className="text-emerald-500 font-semibold">
                  {receipt.newHealthFactor.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-center justify-center gap-2 text-red-500 font-medium text-sm">
              <AlertCircle size={16} />
              {error ?? "Payment failed. Please try again."}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-0">
        {state === "idle" && (
          <Button
            onClick={handleTap}     // ← synchronous, no wrapper
            disabled={!canTap}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Smartphone className="mr-2 h-5 w-5" />
            {isWebNFCSupported ? "Tap to Pay" : "Simulate Tap"}
          </Button>
        )}

        {(state === "success" || state === "error") && (
          <Button
            variant="outline"
            onClick={reset}
            className="w-full h-12"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        )}

        {state === "scanning" && (
          <p className="w-full text-center py-3 text-sm font-medium text-muted-foreground animate-pulse">
            Bring your phone close to the terminal…
          </p>
        )}

        {state === "processing" && (
          <p className="w-full text-center py-3 text-sm font-medium text-amber-500">
            Authorising on Solana…
          </p>
        )}

        {!walletAddress && state === "idle" && (
          <p className="text-xs text-center text-muted-foreground">
            Connect your wallet to enable payments.
          </p>
        )}
      </CardFooter>
    </Card>
  );
};
