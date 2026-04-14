use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient collateral")]
    InsufficientCollateral,

    #[msg("Health factor too low")]
    HealthFactorTooLow,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Stale oracle price - price is too old")]
    StaleOraclePrice,

    #[msg("Oracle confidence interval too wide")]
    OracleConfidenceTooWide,

    #[msg("Unauthorized - only vault authority can perform this action")]
    Unauthorized,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Insufficient liquidity in vault")]
    InsufficientLiquidity,

    #[msg("Position not found")]
    PositionNotFound,

    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
}