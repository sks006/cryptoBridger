"use client";

import { useState } from "react";
import { ArrowDownLeft, Loader2, CheckCircle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { depositCollateral } from "@/lib/api-client";
import { formatCurrency, formatSol } from "@/lib/utils";

const QUICK_AMOUNTS = [1, 2, 5, 10];
const SOL_PRICE_USD = 168.45;

interface TopupProps {
  walletAddress: string;
  currentCollateralUsd: number;
  availableCredit: number;
  onSuccess?: (newCredit: number) => void;
}

export default function Topup({
  walletAddress,
  currentCollateralUsd,
  availableCredit,
  onSuccess,
}: TopupProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ txHash: string; newCredit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const solAmount = parseFloat(amount) || 0;
  const usdValue = solAmount * SOL_PRICE_USD;
  const newCreditline = availableCredit + usdValue * 0.8;

  const handleDeposit = async () => {
    if (!solAmount || solAmount <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await depositCollateral({
        walletAddress,
        amount: solAmount,
        signature: "mock_sig_" + Date.now(),
      });
      if (result.success) {
        setSuccess({ txHash: result.txHash, newCredit: result.newAvailableCredit });
        onSuccess?.(result.newAvailableCredit);
        setAmount("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          Deposit SOL Collateral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current state */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Current Collateral</p>
            <p className="font-semibold">{formatCurrency(currentCollateralUsd)}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground mb-1">Available Credit</p>
            <p className="font-semibold text-emerald-400">{formatCurrency(availableCredit)}</p>
          </div>
        </div>

        {/* Quick amounts */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Amount (SOL)</Label>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(String(amt))}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  amount === String(amt)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {amt} SOL
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount input */}
        <div className="space-y-2">
          <Label htmlFor="sol-amount">Custom Amount</Label>
          <div className="relative">
            <Input
              id="sol-amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16"
              min="0"
              step="0.01"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
              SOL
            </span>
          </div>
          {solAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              ≈ {formatCurrency(usdValue)} USD · New credit line:{" "}
              <span className="text-emerald-400">{formatCurrency(newCreditline)}</span>
            </p>
          )}
        </div>

        {/* Info box */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Deposited SOL is locked as collateral. You receive an 80% LTV credit
            line instantly. Collateral earns up to 13% APY while locked.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Deposit successful!</p>
              <p className="text-xs text-muted-foreground mt-1">
                New available credit: {formatCurrency(success.newCredit)}
              </p>
              <a
                href={`https://solscan.io/tx/${success.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on Solscan: {success.txHash}
              </a>
            </div>
          </div>
        )}

        <Button
          variant="gradient"
          className="w-full"
          onClick={handleDeposit}
          disabled={loading || !solAmount}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowDownLeft className="w-4 h-4" />
              Deposit {solAmount > 0 ? formatSol(solAmount) : "SOL"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
