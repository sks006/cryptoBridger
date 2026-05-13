"use client";

// =============================================================================
// MerchantQRDisplay — generates a per-request QR code for the customer to scan
// =============================================================================
//
// Merchant enters name + amount → we generate a payment payload encoded as
// JSON with a unique invoice ID and timestamp (so old QRs can't be replayed).
// The customer's phone scans this QR to capture: merchant name, amount,
// currency, recipient wallet address.
//
// Replaces the old NFC tag writer. Same UI, same payload format, same
// downstream flow — just renders a QR instead of writing to an NFC chip.
// =============================================================================

import { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useEffectiveWallet } from "@/hooks/useEffectiveWallet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store,
  CheckCircle2,
  AlertCircle,
  QrCode,
  RotateCcw,
  Wallet as WalletIcon,
} from "lucide-react";

// Shape of the payload encoded into the QR. Must match what QRScanner parses.
export interface MerchantQRPayload {
  type: "cardbridger-payment";       // discriminator so we don't accept arbitrary QRs
  merchant: string;
  amount: string;                     // string to avoid float precision issues
  currency: "EUR";
  invoice: string;                    // unique per QR — replay protection
  recipient: string;                  // merchant's wallet (where EURC lands)
  ts: number;                         // QR generation time in ms
}

type DisplayState = "input" | "showing";

export default function MerchantQRDisplay() {
  // Merchant's wallet is the EURC destination. We use whichever wallet is
  // active (desktop / in-app browser / deep-link).
  const { publicKey: receiverPubkey } = useEffectiveWallet();

  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<DisplayState>("input");
  const [error, setError] = useState<string | null>(null);
  // Cache the generated payload so the QR doesn't re-render and change ID
  // on every keystroke when in showing state.
  const [activePayload, setActivePayload] = useState<MerchantQRPayload | null>(null);

  // Short-form wallet for the UI.
  const shortAddr = useMemo(() => {
    if (!receiverPubkey) return "";
    const s = receiverPubkey.toBase58();
    return `${s.slice(0, 4)}…${s.slice(-4)}`;
  }, [receiverPubkey]);

  const generateQR = () => {
    setError(null);

    if (!receiverPubkey) {
      setError("Connect your Solana wallet first — it's where EURC will be received");
      return;
    }
    const value = parseFloat(amount);
    if (!merchantName.trim()) {
      setError("Enter a merchant name");
      return;
    }
    if (!isFinite(value) || value <= 0) {
      setError("Enter a valid EURC amount");
      return;
    }

    // Build the payload. Every QR has a fresh invoice + timestamp so it can't
    // be screenshot'd and reused. The customer's app should reject anything
    // with a `ts` older than a few minutes.
    const payload: MerchantQRPayload = {
      type: "cardbridger-payment",
      merchant: merchantName.trim(),
      amount: value.toFixed(2),
      currency: "EUR",
      invoice: `INV-${Date.now().toString(36).toUpperCase()}`,
      recipient: receiverPubkey.toBase58(),
      ts: Date.now(),
    };

    setActivePayload(payload);
    setState("showing");
  };

  const reset = () => {
    setState("input");
    setError(null);
    setActivePayload(null);
  };

  // The QR encodes the JSON payload as a single string. Customer's scanner
  // parses it back into the payload shape.
  const qrString = activePayload ? JSON.stringify(activePayload) : "";

  return (
    <Card className="w-full max-w-sm mx-auto border-2 border-cyan-500/30 bg-gradient-to-br from-zinc-900 via-cyan-950/20 to-black shadow-2xl shadow-cyan-500/10">
      <CardHeader className="pb-3 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-2">
          <Store className="w-6 h-6 text-cyan-400" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Merchant Terminal
        </CardTitle>
        <p className="text-xs text-cyan-100/60">
          Generate a payment QR the customer can scan to pay
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Wallet not connected — show prompt instead of input */}
        {!receiverPubkey && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <WalletIcon className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200">
              Connect this phone's wallet first — EURC will be sent here when
              the customer scans.
            </p>
          </div>
        )}

        {state === "input" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="merchant-name" className="text-zinc-300">Merchant name</Label>
              <Input
                id="merchant-name"
                placeholder="e.g. Le Petit Café"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-amount" className="text-zinc-300">Amount (EURC)</Label>
              <div className="relative">
                <Input
                  id="merchant-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-cyan-400">
                  EURC
                </span>
              </div>
              {receiverPubkey && (
                <p className="text-xs text-zinc-400">
                  Receiving wallet:{" "}
                  <span className="font-mono text-cyan-400">{shortAddr}</span>
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <Button
              onClick={generateQR}
              disabled={!merchantName || !amount || !receiverPubkey}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg disabled:opacity-50"
            >
              <QrCode className="mr-2 h-5 w-5" />
              Generate Payment QR
            </Button>
          </>
        )}

        {state === "showing" && activePayload && (
          <div className="space-y-4">
            {/* QR display — white background helps camera scanners */}
            <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <QRCodeSVG
                value={qrString}
                size={240}
                level="M"
                marginSize={2}
              />
            </div>

            {/* Receipt summary */}
            <div className="bg-zinc-950/60 rounded-lg border border-cyan-500/20 p-3 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-zinc-400">Merchant</span>
                <span className="font-medium text-white">{activePayload.merchant}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-zinc-400">Amount</span>
                <span className="font-bold text-cyan-300">
                  €{activePayload.amount} EURC
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-zinc-400">Invoice</span>
                <span className="font-mono text-[10px] text-zinc-300">{activePayload.invoice}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-100/80">
                Show this QR to the customer. They scan it from the Sender tab
                to send €{activePayload.amount} EURC to your wallet.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={reset}
              className="w-full h-12"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Payment Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}