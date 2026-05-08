// programs/lending_vault/tests/initialize.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { LendingVault } from "../../target/types/lending_vault";

describe("lending_vault - Initialize", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LendingVault as Program<LendingVault>;

  const vaultPda = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  )[0];

  const vaultTokenAccountPda = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_token_account")],
    program.programId
  )[0];

  it("Initializes the lending vault", async () => {
    console.log("🔨 Initializing Vault PDA:", vaultPda.toBase58());
    console.log("🔨 Vault Token Account PDA:", vaultTokenAccountPda.toBase58());
    console.log("📍 Using Program ID:", program.programId.toBase58());

    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          authority: provider.wallet.publicKey,
          vault: vaultPda,
          vaultTokenAccount: vaultTokenAccountPda,
          wsolMint: new PublicKey("So11111111111111111111111111111111111111112"), // WSOL Mint
          systemProgram: SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      console.log("✅ Vault initialized successfully!");
      console.log("📝 Transaction signature:", tx);

      // Fetch and show vault state
      const vaultAccount = await program.account.vault.fetch(vaultPda);
      
      console.log("\n📊 Vault Configuration:");
      console.log(`   LTV Threshold        : ${vaultAccount.ltvThreshold}%`);
      console.log(`   Liquidation Threshold: ${vaultAccount.liquidationThreshold}%`);
      console.log(`   Liquidation Bonus    : ${vaultAccount.liquidationBonus}%`);

    } catch (error: any) {
      if (error.toString().includes("already in use") || error.toString().includes("Account already exists")) {
        console.log("⚠️ Vault is already initialized.");
      } else {
        console.error("❌ Initialization failed:", error);
        throw error;
      }
    }
  });
});