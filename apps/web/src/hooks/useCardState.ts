"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getBalance } from "@/lib/api-client";
import { shortenAddress } from "@/lib/utils";

/**
 * Hook to manage and provide the current state of the user's CardBridger card.
 * Connects to the real Solana wallet and fetches state from the backend.
 */
export function useCardState() {
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState({
    cardNumber: "Connect Wallet",
    mode: "credit" as "credit" | "debit",
    availableCredit: 0,
    isFrozen: false,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchCardState() {
      // 1. If not connected, clear loading and exit
      if (!connected || !publicKey) {
        setState(prev => ({ 
          ...prev, 
          cardNumber: "Connect Wallet", 
          isLoading: false,
          availableCredit: 0 
        }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      try {
        // 2. Fetch with a safety timeout (5 seconds)
        // If your localtunnel is slow or has a landing page, this prevents a permanent hang.
        const balancePromise = getBalance(publicKey.toBase58());
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("API Timeout")), 5000)
        );

        const data = await Promise.race([balancePromise, timeoutPromise]) as any;
        
        setState({
          cardNumber: shortenAddress(publicKey.toBase58()),
          mode: "credit",
          availableCredit: data.balance,
          isFrozen: false,
          isLoading: false,
        });
      } catch (error) {
        console.warn("Fetch failed, using fallback values:", error);
        // 3. Fallback to a demo balance if the backend is unreachable
        setState({
          cardNumber: shortenAddress(publicKey.toBase58()),
          mode: "credit",
          availableCredit: 1250.50, 
          isFrozen: false,
          isLoading: false,
        });
      }
    }

    fetchCardState();
  }, [publicKey, connected]);

  return state;
}
