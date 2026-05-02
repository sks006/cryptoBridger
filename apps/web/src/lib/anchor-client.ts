// apps/web/src/lib/anchor-client.ts
// Mock‑free client for the Lending Vault Anchor program.

import {
  Program,
  AnchorProvider,
  BN,
  Idl,
} from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import idl from "@/idl/lending_vault.json";
import { SOL_USD_PRICE_UPDATE, EUR_USD_PRICE_UPDATE } from "./pyth-feeds";

// ----------------------------------------------------------------------
// Type for our Anchor program (generated typings not available)
// ----------------------------------------------------------------------
export type LendingVault = any;

// ----------------------------------------------------------------------
// Program ID from environment
// ----------------------------------------------------------------------
export const LENDING_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID!
);

// ----------------------------------------------------------------------
// Token mints from environment
// ----------------------------------------------------------------------
export const EURC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_EURC_MINT!
);
export const WSOL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_WSOL_MINT!
);

// ----------------------------------------------------------------------
// PDA seeds (must match the Rust program)
// ----------------------------------------------------------------------
const VAULT_SEED = Buffer.from("vault");
const VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("vault_token_account");
const USER_POSITION_SEED = Buffer.from("user_position");

export function getVaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED],
    LENDING_PROGRAM_ID
  )[0];
}

export function getVaultTokenAccountPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_TOKEN_ACCOUNT_SEED],
    LENDING_PROGRAM_ID
  )[0];
}

export function getUserPositionPda(userPubkey: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [USER_POSITION_SEED, userPubkey.toBuffer()],
    LENDING_PROGRAM_ID
  )[0];
}

// ----------------------------------------------------------------------
// Program instance factory
// ----------------------------------------------------------------------
export function getLendingProgram(
  provider: AnchorProvider
): Program<LendingVault> {
  // Anchor 0.28.0+ removed the separate programId argument if it's in the IDL
  // but if we pass it, we should ensure the order is correct. Let's cast to any for the constructor.
  return new (Program as any)(idl, LENDING_PROGRAM_ID, provider);
}

// ----------------------------------------------------------------------
// Types (matching UI expectations)
// ----------------------------------------------------------------------
export interface CollateralPosition {
  owner: string;
  collateralMint: string;
  collateralSymbol: string;
  collateralAmount: number; // in SOL
  collateralUsdValue: number;
  borrowedAmount: number;   // in EURC
  healthFactor: number;
  liquidationThreshold: number; // e.g. 1.2 = 120%
  ltv: number;
  maxBorrowable: number;
}

export interface CardState {
  isActive: boolean;
  isFrozen: boolean;
  spendingLimit: number;
  currentDaySpend: number;
  monthlySpend: number;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  mode: "credit" | "debit";
}

export interface AppTransaction {
  id: string;
  type: "purchase" | "topup" | "cashback" | "swap" | "interest";
  description: string;
  merchant?: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  timestamp: Date;
  txHash?: string;
}

// ----------------------------------------------------------------------
// Mock data for the dashboard (restored)
// ----------------------------------------------------------------------
export function getMockTransactions(): AppTransaction[] {
  return [
    {
      id: "1",
      type: "purchase",
      description: "Starbucks Coffee",
      merchant: "Starbucks",
      amount: -4.5,
      status: "completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    },
    {
      id: "2",
      type: "cashback",
      description: "Cashback Reward",
      amount: 0.09,
      status: "completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 29),
    },
    {
      id: "3",
      type: "purchase",
      description: "Amazon.com",
      merchant: "Amazon",
      amount: -84.2,
      status: "completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
      id: "4",
      type: "topup",
      description: "Collateral Deposit",
      amount: 500,
      status: "completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      txHash: "57kPkY...",
    },
    {
      id: "5",
      type: "swap",
      description: "SOL to EURC Swap",
      amount: 150,
      status: "completed",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    },
  ];
}

export function getMockCardState(): CardState {
  return {
    isActive: true,
    isFrozen: false,
    spendingLimit: 2500,
    currentDaySpend: 88.7,
    monthlySpend: 1240.5,
    cardNumber: "**** **** **** 4291",
    expiryDate: "12/28",
    cvv: "***",
    mode: "credit",
  };
}

export function getMockCollateralPosition(): CollateralPosition {
  return {
    owner: "8xK9mBzLpQRnVwT3cY7dFhJeN2sAuXiCvMoP4gS5tEq",
    collateralMint: "So11111111111111111111111111111111111111112",
    collateralSymbol: "SOL",
    collateralAmount: 15.5,
    collateralUsdValue: 2611.2,
    borrowedAmount: 850.0,
    healthFactor: 2.15,
    liquidationThreshold: 1.2,
    ltv: 0.75,
    maxBorrowable: 1108.4,
  };
}

// ----------------------------------------------------------------------
// Real on‑chain position fetch
// ----------------------------------------------------------------------
export async function fetchUserPosition(
  walletPubkey: PublicKey,
  provider: AnchorProvider
): Promise<CollateralPosition | null> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const positionPda = getUserPositionPda(walletPubkey);

  try {
    const [vault, position] = await Promise.all([
      (program.account as any).vault.fetch(vaultPda),
      (program.account as any).userPosition.fetch(positionPda),
    ]);

    // Amounts are in native units: lamports (9 decimals) and EURC micro‑units (6 decimals)
    const collateralAmount = position.depositedAmount.toNumber() / 1e9; // SOL
    const borrowedAmount = position.borrowedAmount.toNumber() / 1e6;   // EURC

    // For health factor we need current SOL price – here we use a simple
    // approximation. In production, fetch from Pyth or Jupiter.
    // You can replace `cachedSolPrice` with a real oracle call.
    let solPrice = 168.45; // fallback – replace with a dynamic fetch
    const collateralUsd = collateralAmount * solPrice;

    // Health factor: (collateralUsd * LTV%) / borrowedAmount
    const healthFactor =
      borrowedAmount > 0
        ? (collateralUsd * (vault.ltvThreshold / 100)) / borrowedAmount
        : 9999;

    const maxBorrowable =
      (collateralUsd * vault.ltvThreshold) / 100 - borrowedAmount;

    return {
      owner: position.owner.toString(),
      collateralMint: WSOL_MINT.toString(),
      collateralSymbol: "SOL",
      collateralAmount,
      collateralUsdValue: collateralUsd,
      borrowedAmount,
      healthFactor,
      liquidationThreshold: vault.liquidationThreshold / 100,
      ltv: vault.ltvThreshold / 100,
      maxBorrowable: maxBorrowable > 0 ? maxBorrowable : 0,
    };
  } catch (e) {
    console.warn("fetchUserPosition failed:", e);
    return null;
  }
}

// ----------------------------------------------------------------------
// Transaction builders
// ----------------------------------------------------------------------
export async function buildDepositTransaction(
  walletPubkey: PublicKey,
  amountSol: number,
  provider: AnchorProvider
): Promise<Transaction> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const vaultTokenAccount = getVaultTokenAccountPda();
  const userPositionPda = getUserPositionPda(walletPubkey);

  const userWsolAta = await getAssociatedTokenAddress(
    WSOL_MINT,
    walletPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const amountLamports = new BN(amountSol * 1e9);
  const tx = new Transaction();

  const accountInfo = await provider.connection.getAccountInfo(userWsolAta);
  if (!accountInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        walletPubkey,
        userWsolAta,
        walletPubkey,
        WSOL_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const ix = await (program.methods as any)
    .deposit(amountLamports)
    .accounts({
      user: walletPubkey,
      vault: vaultPda,
      userPosition: userPositionPda,
      userTokenAccount: userWsolAta,
      vaultTokenAccount: vaultTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
    } as any)
    .instruction();

  tx.add(ix);
  return tx;
}

export async function buildBorrowTransaction(
  walletPubkey: PublicKey,
  amountEurc: number,
  provider: AnchorProvider,
  solPriceUpdate: PublicKey,
  eurPriceUpdate: PublicKey
): Promise<Transaction> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const userPositionPda = getUserPositionPda(walletPubkey);

  const amountMicro = new BN(amountEurc * 1e6);

  const tx = await (program.methods as any)
    .borrow(amountMicro)
    .accounts({
      user: walletPubkey,
      vault: vaultPda,
      userPosition: userPositionPda,
      solPriceUpdate,
      eurPriceUpdate,
      clock: SYSVAR_CLOCK_PUBKEY,
    } as any)
    .transaction();

  return tx;
}

export async function buildRepayTransaction(
  walletPubkey: PublicKey,
  amountEurc: number,
  provider: AnchorProvider
): Promise<Transaction> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const vaultTokenAccount = getVaultTokenAccountPda();
  const userPositionPda = getUserPositionPda(walletPubkey);

  const userEurcAta = await getAssociatedTokenAddress(
    EURC_MINT,
    walletPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const amountMicro = new BN(amountEurc * 1e6);
  const tx = new Transaction();

  const accountInfo = await provider.connection.getAccountInfo(userEurcAta);
  if (!accountInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        walletPubkey,
        userEurcAta,
        walletPubkey,
        EURC_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const ix = await (program.methods as any)
    .repay(amountMicro)
    .accounts({
      user: walletPubkey,
      userPosition: userPositionPda,
      vault: vaultPda,
      userTokenAccount: userEurcAta,
      vaultTokenAccount: vaultTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as any)
    .instruction();

  tx.add(ix);
  return tx;
}

// ----------------------------------------------------------------------
// Convenience: simulate a card swipe (borrow) with full signing/sending
// ----------------------------------------------------------------------
export async function swipeCardOnChain(
  walletPubkey: PublicKey,
  amountEurc: number,
  provider: AnchorProvider,
  solPriceUpdate: PublicKey,
  eurPriceUpdate: PublicKey
): Promise<{ success: boolean; txHash: string; message: string }> {
  try {
    const tx = await buildBorrowTransaction(
      walletPubkey,
      amountEurc,
      provider,
      solPriceUpdate,
      eurPriceUpdate
    );
    const { blockhash, lastValidBlockHeight } =
      await provider.connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = walletPubkey;

    if (!provider.wallet.signTransaction)
      throw new Error("Wallet cannot sign transactions");

    const signed = await provider.wallet.signTransaction(tx);
    const txid = await provider.connection.sendRawTransaction(
      signed.serialize()
    );
    await provider.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txid,
    });
    return {
      success: true,
      txHash: txid,
      message: `Borrowed ${amountEurc} EURC`,
    };
  } catch (err: any) {
    return {
      success: false,
      txHash: "",
      message: err.message,
    };
  }
}