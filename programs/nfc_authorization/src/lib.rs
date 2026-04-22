use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod error;

use instructions::*;

declare_id!("NFC1111111111111111111111111111111111111111");

#[program]
pub mod nfc_authorization {
    use super::*;

    pub fn register_device(ctx: Context<RegisterDevice>, device_id: String) -> Result<()> {
        instructions::register_device::handler(ctx, device_id)
    }

    pub fn authorize_tap(ctx: Context<AuthorizeTap>, amount: u64, nonce: String) -> Result<()> {
        instructions::authorize_tap::handler(ctx, amount, nonce)
    }

    pub fn revoke_device(ctx: Context<RevokeDevice>) -> Result<()> {
        instructions::revoke_device::handler(ctx)
    }
}
