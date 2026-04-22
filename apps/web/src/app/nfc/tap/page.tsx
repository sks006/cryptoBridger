"use client";

import React, { useState, useEffect } from "react";
import { NFCTapButton } from "@/components/NFCTapButton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useHealthFactor } from "@/hooks/useHealthFactor";

const MAX_LTV_PERCENT = 40;

export default function NFCTapPage() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || "7xKpABC123demoWallet9mN3";
  const { position, healthFactor: liveHealthFactor } = useHealthFactor(walletAddress);

  const collateralUsdc = position?.collateralUsdValue || 1250.00;
  const healthFactor = position ? liveHealthFactor : 2.45;

  const [amount, setAmount] = useState<number>(8.40);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate maximum allowed spend
  const maxSpend = (collateralUsdc * MAX_LTV_PERCENT) / 100;
  const isOverLimit = amount > maxSpend;
  const availableCreditPercent = MAX_LTV_PERCENT;

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12 bg-background">
      <div className="text-center space-y-2 max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight">NFC Tap-to-Pay</h1>
        <p className="text-sm text-muted-foreground">
          Spend crypto without selling — powered by Solana
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Collateral Balance</span>
            <span className="text-2xl font-bold">${collateralUsdc.toFixed(2)} USDC</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Health Factor</span>
            <span className="text-2xl font-bold text-emerald-500">
              {healthFactor.toFixed(2)}x
            </span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Available to Spend (40% LTV)</span>
              <span className="font-semibold text-emerald-600">${maxSpend.toFixed(2)} USDC</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-2 bg-emerald-500 rounded-full transition-all"
                style={{ width: `${availableCreditPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex justify-between">
            <span>Amount to Spend (USDC)</span>
            {isOverLimit && (
              <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                <AlertCircle size={14} /> Over 40% limit
              </span>
            )}
          </label>
          
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="text-4xl font-bold h-16 text-center"
            step="0.01"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[5, 8.40, 15, 25, 50, 100].map((val) => (
            <Button
              key={val}
              variant={amount === val ? "default" : "outline"}
              onClick={() => setAmount(val)}
              className="flex-1 min-w-[60px]"
            >
              ${val}
            </Button>
          ))}
        </div>

        {isOverLimit && (
          <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
            <AlertCircle size={18} />
            You can only spend up to <strong>${maxSpend.toFixed(2)}</strong> (40% of collateral)
          </div>
        )}
      </div>

      <NFCTapButton 
        amount={amount} 
        walletAddress={walletAddress}
        healthFactor={healthFactor}
      />

      <div className="text-center text-xs text-muted-foreground max-w-xs">
        <p>Your collateral is safe. This transaction uses Just-in-Time funding on Solana.</p>
      </div>
    </main>
  );
}
