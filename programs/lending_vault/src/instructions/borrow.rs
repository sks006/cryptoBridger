use anchor_lang::prelude::*;
use crate::state::{ Vault, UserPosition };
use crate::error::ErrorCode;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2, get_feed_id_from_hex};

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"user_position", user.key().as_ref()],
        bump = user_position.bump,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Pyth SOL/USD price feed (PriceUpdateV2 pull-oracle account)
    pub sol_price_update: Account<'info, PriceUpdateV2>,

    /// Pyth EUR/USD price feed (for EURC valuation)
    pub eur_price_update: Account<'info, PriceUpdateV2>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);

    let user_position = &mut ctx.accounts.user_position;
    let vault = &mut ctx.accounts.vault;

    // Load Pyth prices via pull-oracle PriceUpdateV2 accounts
    // Feed IDs from https://pyth.network/developers/price-feed-ids
    let sol_feed_id = get_feed_id_from_hex("ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d")
        .map_err(|_| ErrorCode::InvalidOracleAccount)?;
    let eur_feed_id = get_feed_id_from_hex("a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b")
        .map_err(|_| ErrorCode::InvalidOracleAccount)?;

    let sol_price = ctx.accounts.sol_price_update
        .get_price_no_older_than(&Clock::get()?, vault.max_price_age as u64, &sol_feed_id)
        .map_err(|_| ErrorCode::StaleOraclePrice)?;

    let eur_price = ctx.accounts.eur_price_update
        .get_price_no_older_than(&Clock::get()?, vault.max_price_age as u64, &eur_feed_id)
        .map_err(|_| ErrorCode::StaleOraclePrice)?;

    // Calculate collateral value in EUR (simplified for MVP)
    let collateral_value_eur =
        ((user_position.deposited_amount as u128) * (sol_price.price as u128)) /
        (10u128).pow(sol_price.exponent.unsigned_abs()) /
        (eur_price.price as u128);

    let debt_value_eur = user_position.borrowed_amount as u128;

    let health_factor = if debt_value_eur == 0 {
        9999u128 // very safe
    } else {
        (collateral_value_eur * 100) / debt_value_eur
    };

    // Safety check
    require!(health_factor >= (vault.liquidation_threshold as u128), ErrorCode::HealthFactorTooLow);

    // Increase debt (this is the "spend" part)
    user_position.borrowed_amount += amount;
    user_position.last_updated = ctx.accounts.clock.unix_timestamp;

    msg!("Borrow successful: {} lamports. New Health Factor: {}", amount, health_factor);

    Ok(())
}




