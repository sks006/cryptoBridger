// apps/web/src/components/cardbridger/MerchantTagWriter.tsx
"use client";

import { useState } from "react";
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
  Store,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WebNFCManager } from "../../lib/nfc/web-nfc";

type WriteState = "idle" | "writing" | "success" | "error";

export default function MerchantTagWriter() {
  const { publicKey } = useWallet();
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<WriteState>("idle");
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" && WebNFCManager.isSupported();

  const writeTag = async () => {
    setError(null);

    if (!publicKey) {
      setError("Connect your merchant wallet first");
      setState("error");
      return;
    }

    const value = parseFloat(amount);
    if (!merchantName.trim()) {
      setError("Enter a merchant name");
      setState("error");
      return;
    }
    if (!isFinite(value) || value <= 0) {
      setError("Enter a valid EURC amount");
      setState("error");
      return;
    }

    setState("writing");
    try {
      await WebNFCManager.writeMerchantTag({
        merchant: merchantName.trim(),
        amount: value.toFixed(2),
        currency: "EUR",
        recipient: publicKey.toBase58(),
        invoice: `INV-${Date.now().toString(36).toUpperCase()}`,
      });
      setState("success");
    } catch (e: any) {
      setError(e?.message ?? "Failed to write NFC tag");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setError(null);
  };

  return (
    <Card className="w-full max-w-sm mx-auto border-2 border-cyan-500/30 bg-gradient-to-br from-zinc-900 via-cyan-950/20 to-black shadow-2xl shadow-cyan-500/10">
      <CardHeader className="pb-3 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-2">
          <Store className="w-6 h-6 text-cyan-400" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">
          Merchant Terminal
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Write a payment request the customer can tap to pay
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!supported && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200">
              Web NFC is not available on this device. Open this page in
              Chrome on Android to write a tag.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="merchant-name">Merchant name</Label>
          <Input
            id="merchant-name"
            placeholder="e.g. Le Petit Café"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            disabled={state === "writing"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="merchant-amount">Amount (EURC)</Label>
          <div className="relative">
            <Input
              id="merchant-amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={state === "writing"}
              className="pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-cyan-400">
              EURC
            </span>
          </div>
        </div>

        {state === "idle" && (
          <Button
            onClick={writeTag}
            disabled={!supported || !merchantName || !amount}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50"
          >
            <Radio className="mr-2 h-5 w-5" />
            Publish NFC Tag
          </Button>
        )}

        {state === "writing" && (
          <div className="flex flex-col items-center gap-3 py-6 text-cyan-300">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Hold a blank tag near the phone…</p>
            <p className="text-xs text-muted-foreground">
              Or hold the customer's phone here
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Tag is live
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hold the customer's phone against this device to receive
                  €{parseFloat(amount).toFixed(2)} EURC.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              Write Another
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                {error ?? "Failed to write the NFC tag"}
              </p>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}