// apps/web/src/components/cardbridger/DepositCollateral.tsx
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProvider } from "../../hooks/useAnchorProvider";
import { buildDepositTransaction } from "../../lib/anchor-client";
import {
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import { Transaction, SystemProgram } from "@solana/web3.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  ArrowDownLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const QUICK_AMOUNTS = [0.5, 1, 2, 5];

interface Props {
  /** Live SOL/USD price from Pyth Hermes — used only for the preview line */
  solPriceUsd: number | null;
  /** Called after a successful deposit so the parent can refresh the position */
  onDeposited?: (signature: string) => void;
}

export default function DepositCollateral({
  solPriceUsd,
  onDeposited,
}: Props) {
  const { publicKey, signTransaction } = useWallet();
  const provider = useAnchorProvider();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ signature: string } | null>(null);

  const solAmount = parseFloat(amount) || 0;
  const usdPreview =
    solPriceUsd && solAmount > 0 ? solAmount * solPriceUsd : null;
  const creditPreview = usdPreview !== null ? usdPreview * 0.8 : null;

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction || !provider) {
      setError("Please connect your Solana wallet first");
      return;
    }
    if (!solAmount || solAmount <= 0) {
      setError("Enter a valid SOL amount");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Build the on-chain deposit instruction
      const depositTx = await buildDepositTransaction(
        publicKey,
        solAmount,
        provider,
      );

      // 2. Wrap native SOL → wSOL so the deposit instruction can take it
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
          lamports: Math.round(solAmount * 1e9),
        }),
      );
      tx.add(createSyncNativeInstruction(wSolAta));
      tx.add(depositTx.instructions[0]);

      // 3. Sign and send
      const { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const signature = await provider.connection.sendRawTransaction(
        signed.serialize(),
      );

      // 4. Wait for confirmation
      await provider.connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );

      setSuccess({ signature });
      setAmount("");
      onDeposited?.(signature);
    } catch (e: any) {
      console.error("Deposit failed:", e);
      setError(e?.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto border-2 border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-emerald-950/20 to-black shadow-2xl shadow-emerald-500/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 uppercase tracking-wider text-xs font-bold">
            Deposit Collateral
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(String(amt))}
              disabled={loading}
              className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                amount === String(amt)
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <Label htmlFor="deposit-sol-amount">Amount</Label>
          <div className="relative">
            <Input
              id="deposit-sol-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="pr-16 text-lg font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-emerald-400">
              SOL
            </span>
          </div>
          {usdPreview !== null && creditPreview !== null && (
            <p className="text-xs text-muted-foreground">
              ≈ ${usdPreview.toFixed(2)} USD · unlocks{" "}
              <span className="text-emerald-400 font-semibold">
                ~${creditPreview.toFixed(2)}
              </span>{" "}
              credit
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 break-words">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Deposit confirmed
              </p>
              <a
                href={`https://explorer.solana.com/tx/${success.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on Solana Explorer
              </a>
            </div>
          </div>
        )}

        <Button
          onClick={handleDeposit}
          disabled={loading || !solAmount || !publicKey}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Confirming on Solana…
            </>
          ) : !publicKey ? (
            "Connect wallet to deposit"
          ) : solAmount > 0 ? (
            <>Deposit {solAmount} SOL</>
          ) : (
            "Deposit SOL"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}