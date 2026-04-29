use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

pub mod client;
pub mod vault_ix;
pub mod jupiter_quote;

// Protocol Seeds (Rules-based constants)
pub const VAULT_SEED: &[u8] = b"vault";
pub const USER_POSITION_SEED: &[u8] = b"user_position";

/// Utility to grab Pubkeys from env with a fallback
pub fn get_env_pubkey(key: &str) -> Pubkey {
    let s = std::env::var(key).expect(&format!("{} not found in .env", key));
    Pubkey::from_str(&s).expect("Invalid Pubkey format")
}