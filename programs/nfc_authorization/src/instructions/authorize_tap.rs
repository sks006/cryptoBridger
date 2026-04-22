use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AuthorizeTap<'info> {
    pub user: Signer<'info>,
}

pub fn handler(_ctx: Context<AuthorizeTap>, _amount: u64, _nonce: String) -> Result<()> {
    Ok(())
}
