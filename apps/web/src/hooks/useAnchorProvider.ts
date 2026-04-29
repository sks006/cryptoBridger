// apps/web/src/hooks/useAnchorProvider.ts
"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useMemo } from "react";

export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!anchorWallet) return null;

    return new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, anchorWallet]);

  return provider;
}