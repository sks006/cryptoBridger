// apps/web/src/lib/anchor-client.ts

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
export type LendingVault = any;

// Program ID (must be set in .env.local)
export const LENDING_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_LENDING_PROGRAM_ID!
);

// Token mints from environment variables
export const EURC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_EURC_MINT!
);
const WSOL_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_WSOL_MINT!
);

// PDA seeds
const VAULT_SEED = Buffer.from("vault");
const VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("vault_token_account");
const USER_POSITION_SEED = Buffer.from("user_position");

/**
 * Helper: get the vault PDA
 */
export function getVaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED],
    LENDING_PROGRAM_ID
  )[0];
}

/**
 * Helper: get the vault token account PDA
 */
export function getVaultTokenAccountPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_TOKEN_ACCOUNT_SEED],
    LENDING_PROGRAM_ID
  )[0];
}

/**
 * Helper: get a user's position PDA
 */
export function getUserPositionPda(userPubkey: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [USER_POSITION_SEED, userPubkey.toBuffer()],
    LENDING_PROGRAM_ID
  )[0];
}

/**
 * Create an Anchor Program instance.
 */
export function getLendingProgram(provider: AnchorProvider): Program<LendingVault> {
  return new Program(idl as Idl, LENDING_PROGRAM_ID, provider);
}

// ----------------------------------------------------------------------
// Types (matching what the UI expects)
// ----------------------------------------------------------------------
export interface CollateralPosition {
  owner: string;
  collateralMint: string;
  collateralSymbol: string;
  collateralAmount: number;        // in SOL (human readable)
  collateralUsdValue: number;
  borrowedAmount: number;         // in EURC (human readable)
  healthFactor: number;
  liquidationThreshold: number;   // e.g. 0.8
  ltv: number;                    // loan‑to‑value ratio
  maxBorrowable: number;          // in USD
}

export interface CardState {
  isActive: boolean;
  isFrozen: boolean;
  spendingLimit: number;   // daily limit in USD
  currentDaySpend: number;
  monthlySpend: number;
  cardNumber: string;      // masked, from wallet address
  expiryDate: string;
  cvv: string;
  mode: "credit" | "debit";
}

export interface Transaction {
  id: string;
  type: "purchase" | "topup" | "cashback" | "swap" | "interest";
  description: string;
  merchant?: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  timestamp: Date;
  txHash?: string;
}

/**
 * Mock data for the dashboard
 */
export function getMockTransactions(): Transaction[] {
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
    liquidationThreshold: 0.8,
    ltv: 0.75,
    maxBorrowable: 1108.4,
  };
}

// Mock price for SOL/USD (replace with Pyth client for real value)
// For a quick demo, use a hardcoded price that's close to market.
let cachedSolPrice = 168.45; // fallback

/**
 * Set the SOL/USD price manually (or fetch from Pyth).
 * In a production app you'd call getPythPrice().
 */
export async function updateSolPrice(provider: AnchorProvider) {
  // Placeholder: you could implement Pyth client here.
  // For now, keep the default.
}

/**
 * Fetch the on‑chain user position and return CollateralPosition.
 */
export async function fetchUserPosition(
  walletPubkey: PublicKey,
  provider: AnchorProvider
): Promise<CollateralPosition | null> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const positionPda = getUserPositionPda(walletPubkey);

  try {
    // Fetch both accounts in parallel
    const [vault, position] = await Promise.all([
      program.account.vault.fetch(vaultPda),
      program.account.userPosition.fetch(positionPda),
    ]);

    // Convert on‑chain amounts to human readable units
    const collateralAmount = position.depositedAmount.toNumber() / 1e9; // SOL
    const collateralUsd = collateralAmount * cachedSolPrice;
    const borrowedAmount = position.borrowedAmount.toNumber() / 1e6; // EURC (6 decimals)

    // Health factor (simplified) – matches on-chain logic
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
    return null; // position doesn't exist yet
  }
}

/**
 * Build a deposit transaction: wraps and deposits SOL as collateral.
 * @param amountSol Amount in SOL (human readable)
 */
export async function buildDepositTransaction(
  walletPubkey: PublicKey,
  amountSol: number,
  provider: AnchorProvider
): Promise<Transaction> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const vaultTokenAccount = getVaultTokenAccountPda();
  const userPositionPda = getUserPositionPda(walletPubkey);

  // Need user's WSOL token account
  const userWsolAta = await getAssociatedTokenAddress(
    WSOL_MINT,
    walletPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const amountLamports = new BN(amountSol * 1e9);

  // Check if ATA exists; if not, add instruction to create it
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

  const ix = await program.methods
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
    })
    .instruction();

  tx.add(ix);
  return tx;
}

/**
 * Build a borrow transaction (simulates a card purchase in credit mode).
 * @param amountEurc Amount in EURC (human readable, e.g. 10.5)
 * Note: requires Pyth price feeds on devnet!
 */
export async function buildBorrowTransaction(
  walletPubkey: PublicKey,
  amountEurc: number,
  provider: AnchorProvider,
  // Pyth accounts must be provided by the caller (we'll explain later)
  solPriceUpdate: PublicKey,
  eurPriceUpdate: PublicKey
): Promise<Transaction> {
  const program = getLendingProgram(provider);
  const vaultPda = getVaultPda();
  const userPositionPda = getUserPositionPda(walletPubkey);

  const amountMicro = new BN(amountEurc * 1e6);

  const tx = await program.methods
    .borrow(amountMicro)
    .accounts({
      user: walletPubkey,
      vault: vaultPda,
      userPosition: userPositionPda,
      solPriceUpdate,
      eurPriceUpdate,
      clock: SYSVAR_CLOCK_PUBKEY,
    })
    .transaction();

  return tx;
}

/**
 * Build a repay transaction (used by NFC tap).
 * @param amountEurc Amount in EURC to repay
 */
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

  // Ensure user has enough EURC (frontend should check before)

  const tx = new Transaction();
  // If ATA doesn't exist, add instruction (though user should have it if they borrowed)
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

  const ix = await program.methods
    .repay(amountMicro)
    .accounts({
      user: walletPubkey,
      userPosition: userPositionPda,
      vault: vaultPda,
      userTokenAccount: userEurcAta,
      vaultTokenAccount: vaultTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  tx.add(ix);
  return tx;
}

/**
 * Simulate card swipe (borrow) for POS Simulator.
 * This calls the on‑chain borrow instruction instead of a mock.
 * NOTE: You still need to pass Pyth accounts.
 */
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
    // Sign and send
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