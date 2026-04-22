use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RevokeDevice<'info> {
    pub user: Signer<'info>,
}

pub fn handler(_ctx: Context<RevokeDevice>) -> Result<()> {
    Ok(())
}
