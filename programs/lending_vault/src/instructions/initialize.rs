use anchor_lang::prelude::*;
use anchor_spl::token::{ Token, TokenAccount, Mint };
use crate::state::{ Vault, UserPosition };
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // You (the founder)

    #[account(init, payer = authority, space = 8 + Vault::INIT_SPACE, seeds = [b"vault"], bump)]
    pub vault: Account<'info, Vault>,

    /// Vault's SOL token account (where all collateral will be held)
    #[account(
        init,
        payer = authority,
        seeds = [b"vault_token_account"],
        bump,
        token::mint = mint,
        token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// We need a mint for wrapped SOL (or use native SOL). For simplicity, we use WSOL mint for MVP.
    pub mint: Account<'info, Mint>, // WSOL mint

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Set authority to the signer (you)
    vault.authority = ctx.accounts.authority.key();

    // Set Pyth price feeds (use devnet feeds for hackathon)
    // SOL/USD devnet feed (update with real one from pyth.network)
    // Correct Devnet Pyth Feed: SOL/USD
    vault.sol_price_feed = pubkey!("J83w4HKmR1QCoo3Cq77znf9DXYH1Fp8pJK3u78d2b7X6"); // ← Add real SOL/USD Pyth feed

    // Correct Devnet Pyth Feed: EUR/USD (Used for EURC pricing)
    vault.eur_price_feed = pubkey!("79N7bpkPu397S8Zg5m8GjGkzJ4xWpTpxkS76mCqKqySj"); // ← Add real EUR/USD Pyth feed

    vault.max_price_age = 120; // 2 minutes
    vault.ltv_threshold = 80; // 80% LTV
    vault.liquidation_threshold = 120; // 1.2x health factor

    vault.total_collateral = 0;
    vault.total_shares = 0;
    vault.bump = ctx.bumps.vault;

    msg!("Vault initialized successfully by {}", ctx.accounts.authority.key());
    Ok(())
}
