use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]  // Optimizes rent cost
pub struct Vault {
    /// Authority (you, the founder/admin) — can update config later
    pub authority: Pubkey,

    /// Total SOL deposited by all users (in lamports)
    pub total_collateral: u64,

    /// Total vault shares issued (for yield distribution)
    pub total_shares: u64,

    /// Pyth price feed for SOL/USD (used for collateral valuation)
    pub sol_price_feed: Pubkey,

    /// Pyth price feed for EUR/USD (used for EURC valuation)
    pub eur_price_feed: Pubkey,

    /// Maximum age of price (in seconds) before we reject it (anti-stale attack)
    pub max_price_age: i64,

    /// Loan-to-Value (LTV) threshold — e.g. 80% = user can borrow up to 80% of collateral value
    pub ltv_threshold: u8,           // 80 = 80%

    /// Liquidation threshold — if Health Factor < this, anyone can liquidate
    pub liquidation_threshold: u8,   // 120 = 1.2x

    

    /// PDA bump seed
    pub bump: u8,
}

impl Vault {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 32 + 32 + 8 + 1 + 1 + 1; // matches InitSpace
}