// apps/web/src/hooks/useSolPrice.ts
"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Pyth Hermes price feed IDs.
// SOL/USD and EUR/USD — the SAME feeds the on-chain `borrow` instruction
// reads via PriceUpdateV2 accounts. Keeping them in sync is what makes the
// front-end numbers match what the chain enforces.
const SOL_USD_FEED_ID =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const EUR_USD_FEED_ID =
  "0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b";

const HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";
const POLL_INTERVAL_MS = 8_000; // refresh roughly every 8 seconds

export interface PriceState {
  solUsd: number | null;
  eurUsd: number | null;
  /** SOL price expressed in EUR — what the UI mostly cares about for credit math */
  solEur: number | null;
  publishTimeMs: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface PythParsedPrice {
  id: string;
  price: {
    price: string;
    expo: number;
    publish_time: number;
  };
}

interface PythResponse {
  parsed?: PythParsedPrice[];
}

function priceFromParsed(p: PythParsedPrice): number {
  // Pyth quotes price as integer + exponent. Final value = price * 10^expo.
  const raw = parseInt(p.price.price, 10);
  return raw * Math.pow(10, p.price.expo);
}

export function useSolPrice(pollMs: number = POLL_INTERVAL_MS): PriceState {
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [eurUsd, setEurUsd] = useState<number | null>(null);
  const [publishTimeMs, setPublishTimeMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrice = useCallback(async () => {
    // Cancel any in-flight request so we never apply stale data.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url =
        `${HERMES_URL}?ids[]=${SOL_USD_FEED_ID}&ids[]=${EUR_USD_FEED_ID}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`);
      const data = (await res.json()) as PythResponse;
      if (!data.parsed || data.parsed.length === 0) {
        throw new Error("Hermes returned no price data");
      }

      let nextSol: number | null = null;
      let nextEur: number | null = null;
      let publishTime: number | null = null;

      for (const p of data.parsed) {
        const id = p.id.startsWith("0x") ? p.id : `0x${p.id}`;
        const value = priceFromParsed(p);
        if (id.toLowerCase() === SOL_USD_FEED_ID.toLowerCase()) {
          nextSol = value;
        } else if (id.toLowerCase() === EUR_USD_FEED_ID.toLowerCase()) {
          nextEur = value;
        }
        publishTime = Math.max(publishTime ?? 0, p.price.publish_time * 1000);
      }

      if (nextSol !== null) setSolUsd(nextSol);
      if (nextEur !== null) setEurUsd(nextEur);
      if (publishTime !== null) setPublishTimeMs(publishTime);
      setError(null);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.warn("Pyth price fetch failed:", e);
      setError(e?.message ?? "Price feed unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, pollMs);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchPrice, pollMs]);

  const solEur =
    solUsd !== null && eurUsd !== null && eurUsd > 0
      ? solUsd / eurUsd
      : null;

  return {
    solUsd,
    eurUsd,
    solEur,
    publishTimeMs,
    loading,
    error,
    refresh: fetchPrice,
  };
}