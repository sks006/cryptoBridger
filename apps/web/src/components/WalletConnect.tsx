"use client";

import { useState } from "react";
import { Wallet, LogOut, Copy, CheckCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockConnectWallet, mockDisconnectWallet, type WalletState } from "@/lib/solana";
import { shortenAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WalletConnectProps {
  onConnect?: (wallet: WalletState) => void;
  onDisconnect?: () => void;
  className?: string;
}

export default function WalletConnect({
  onConnect,
  onDisconnect,
  className,
}: WalletConnectProps) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0,
  });
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    await new Promise((r) => setTimeout(r, 800));
    const w = mockConnectWallet();
    setWallet(w);
    onConnect?.(w);
    setConnecting(false);
  };

  const handleDisconnect = () => {
    const w = mockDisconnectWallet();
    setWallet(w);
    setDropdownOpen(false);
    onDisconnect?.();
  };

  const handleCopy = async () => {
    if (wallet.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!wallet.connected) {
    return (
      <Button
        variant="gradient"
        size="default"
        onClick={handleConnect}
        disabled={connecting}
        className={cn("gap-2", className)}
      >
        <Wallet className="w-4 h-4" />
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
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
          {shortenAddress(wallet.address!)}
        </span>
        <Badge variant="success" className="text-xs hidden sm:flex">
          {wallet.balance.toFixed(2)} SOL
        </Badge>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-20 overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
              <p className="font-mono text-sm text-foreground break-all">
                {wallet.address}
              </p>
            </div>
            <div className="p-2">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy Address"}
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-sm text-destructive"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
