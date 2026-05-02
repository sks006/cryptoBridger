// apps/web/src/app/providers.tsx
"use client";

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';

// CRITICAL: Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new PhantomWalletAdapter(),
    ],
    []
  );

  // Prevent SSR of wallet providers to avoid hydration mismatches
  if (!mounted) {
    return (
      <ConnectionProvider endpoint={endpoint}>
        {children}
      </ConnectionProvider>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={(error) => {
          // Suppress WalletNotReadyError to avoid console spam in dev/mobile
          if (error.name === 'WalletNotReadyError') {
            console.debug("Wallet not ready (usually autoConnect without wallet extension).");
            return;
          }
          console.error("Wallet Error:", error);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}