// apps/web/src/components/NFCRingAnimation.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Smartphone, Wifi, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { NFCTapState } from "@/lib/nfc";

interface NFCRingAnimationProps {
  active: boolean;
  /** Current tap state — drives ring color and center icon */
  status: NFCTapState;
  className?: string;
}

const STATUS_CONFIG: Record<
  NFCTapState,
  { ring: string; gradient: string; icon: React.ReactNode }
> = {
  idle: {
    ring: "border-zinc-400/30",
    gradient: "from-zinc-500 to-zinc-400",
    icon: (
      <div className="relative">
        <Smartphone className="w-11 h-11 text-white/70" />
        <Wifi className="absolute -top-2 -right-2 w-5 h-5 text-white/40 rotate-45" />
      </div>
    ),
  },
  scanning: {
    ring: "border-blue-500/50",
    gradient: "from-blue-500 to-cyan-400",
    icon: (
      <div className="relative">
        <Smartphone className="w-11 h-11 text-white" />
        <Wifi className="absolute -top-2 -right-2 w-5 h-5 text-white/60 rotate-45 animate-pulse" />
      </div>
    ),
  },
  processing: {
    ring: "border-amber-500/50",
    gradient: "from-amber-500 to-yellow-400",
    icon: <Loader2 className="w-11 h-11 text-white animate-spin" />,
  },
  success: {
    ring: "border-emerald-500/50",
    gradient: "from-emerald-500 to-teal-400",
    icon: <CheckCircle2 className="w-11 h-11 text-white" />,
  },
  error: {
    ring: "border-red-500/50",
    gradient: "from-red-500 to-orange-400",
    icon: <XCircle className="w-11 h-11 text-white" />,
  },
};

export const NFCRingAnimation: React.FC<NFCRingAnimationProps> = ({
  active,
  status,
  className,
}) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center w-36 h-36",
        className,
      )}
    >
      {/* Animated rings — only shown when active */}
      {active && (
        <>
          {[0, 0.25, 0.5].map((delay, i) => (
            <div
              key={i}
              className={cn(
                "absolute rounded-full border-2 animate-ping transition-colors duration-500",
                cfg.ring,
              )}
              style={{
                inset: `${i * 12}px`,
                opacity: 0.15 + i * 0.1,
                animationDelay: `${delay}s`,
                animationDuration: "1.4s",
              }}
            />
          ))}
        </>
      )}

      {/* Static outer ring — always visible */}
      <div
        className={cn(
          "absolute inset-2 rounded-full border-2 transition-colors duration-500",
          active ? cfg.ring : "border-zinc-300/20",
        )}
      />

      {/* Center icon tile */}
      <div
        className={cn(
          "relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center",
          "bg-gradient-to-br shadow-xl transition-all duration-500",
          active ? "scale-110" : "scale-100",
          cfg.gradient,
        )}
      >
        {/* glass overlay */}
        <div className="absolute inset-0 rounded-3xl bg-white/10 backdrop-blur-sm" />
        <div className="relative z-10">{cfg.icon}</div>
      </div>
    </div>
  );
};
