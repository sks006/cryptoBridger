// apps/web/src/app/nfc/tap/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { NFCTapButton } from "@/components/NFCTapButton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useHealthFactor } from "@/hooks/useHealthFactor";
import { useNFCTap } from "@/hooks/useNFCTap";

export default function NFCTapPage() {
  const { connected, publicKey } = useWallet();
  const { position, healthFactor, loading: healthLoading } = useHealthFactor();
  const { state, error, receipt, startTap, reset } = useNFCTap();

  const [amount, setAmount] = useState<number>(5);
  const [mounted, setMounted] = useState(false);

  // Derived values (kept minimal)
  const collateralUsd = position?.collateralUsdValue || 0;
  const maxSpend = position?.maxBorrowable || 0;
  const isOverLimit = amount > maxSpend;
  const availableCreditPercent = collateralUsd > 0 
    ? Math.min((maxSpend / collateralUsd) * 100, 100) 
    : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-reset amount if it exceeds new maxSpend (e.g. after a tap)
  useEffect(() => {
    if (amount > maxSpend && maxSpend > 0) {
      setAmount(Math.floor(maxSpend));
    }
  }, [maxSpend, amount]);

  const handleQuickAmount = (val: number) => {
    if (val <= maxSpend) setAmount(val);
  };

  if (!mounted) return null;

  if (!connected || !publicKey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-background">
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">NFC Tap-to-Pay</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Solana wallet to start spending without selling your crypto.
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

      {/* Account Summary Card */}
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
              <p className={`text-2xl font-bold tabular-nums ${
                healthFactor >= 2.0 ? "text-emerald-400" : 
                healthFactor >= 1.5 ? "text-yellow-400" : "text-red-400"
              }`}>
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

      {/* Amount Input */}
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex justify-between">
            <span>Amount to Pay (EURC)</span>
            {isOverLimit && (
              <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                <AlertCircle size={14} /> Exceeds limit
              </span>
            )}
          </label>

          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
            placeholder="0.00"
            className="text-4xl font-bold h-16 text-center"
            step="0.01"
            min="0"
          />
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2 flex-wrap">
          {[5, 10, 15, 25, 50].map((val) => (
            <Button
              key={val}
              variant={amount === val ? "default" : "outline"}
              onClick={() => handleQuickAmount(val)}
              className="flex-1"
              disabled={val > maxSpend}
            >
              €{val}
            </Button>
          ))}
        </div>

        {isOverLimit && (
          <div className="text-red-500 text-sm flex items-center gap-2 bg-red-950/50 p-3 rounded-lg">
            <AlertCircle size={18} />
            Maximum spend is €{maxSpend.toFixed(2)}
          </div>
        )}
      </div>

      {/* Core Tap Button */}
      <NFCTapButton
        amount={amount}
        onTap={startTap}
        state={state}
        error={error}
        receipt={receipt}
        onReset={reset}
        disabled={isOverLimit || amount <= 0}
      />

      <div className="text-center text-xs text-muted-foreground max-w-xs">
        This will instantly borrow EURC against your SOL collateral via Jupiter on Solana.
      </div>
    </main>
  );
}

