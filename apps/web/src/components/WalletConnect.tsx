"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  useWalletModal,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Wallet, LogOut, Copy, CheckCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shortenAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react"; // ← useEffect added
import { LAMPORTS_PER_SOL } from "@/lib/solana";
import { useConnection } from "@solana/wallet-adapter-react";

interface WalletConnectProps {
  className?: string;
}

export default function WalletConnect({ className }: WalletConnectProps) {
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // ✅ Fetch balance whenever publicKey, connected, or connection changes
  useEffect(() => {
    if (connected && publicKey) {
      connection
        .getBalance(publicKey)
        .then((b) => setBalance(b / LAMPORTS_PER_SOL))
        .catch((err) => {
          console.warn(
            "Could not fetch balance (wallet might be transitioning):",
            err,
          );
          setBalance(null);
        });
    } else {
      setBalance(null);
    }
  }, [publicKey, connected, connection]);

  const handleCopy = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!connected) {
    return (
      <div className={className}>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-sm"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-foreground font-mono">
          {shortenAddress(publicKey!.toBase58())}
        </span>
        {balance !== null && (
          <Badge variant="success" className="text-xs hidden sm:flex">
            {balance.toFixed(2)} SOL
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            dropdownOpen && "rotate-180",
          )}
        />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/5 z-20 overflow-hidden ring-1 ring-white/5">
            <div className="p-4 border-b border-border/50 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Connected Wallet
              </p>
              <p className="font-mono text-sm text-foreground break-all bg-background/50 p-2 rounded-md border border-border/50 shadow-inner">
                {publicKey!.toBase58()}
              </p>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={handleCopy}
                className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-transparent hover:bg-secondary/80 active:scale-[0.98] transition-all duration-200 text-sm font-medium text-muted-foreground hover:text-foreground ring-1 ring-transparent hover:ring-border/50"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background shadow-sm border border-border/50 group-hover:border-border transition-colors">
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
                {copied ? "Address Copied" : "Copy Address"}
              </button>

              <button
                onClick={disconnect}
                className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-transparent hover:bg-red-500/10 active:scale-[0.98] transition-all duration-200 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 ring-1 ring-transparent hover:ring-red-500/20"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/10 border border-transparent group-hover:border-red-500/20 transition-colors">
                  <LogOut className="w-4 h-4" />
                </div>
                Disconnect Wallet
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
