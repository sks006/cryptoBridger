use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::state::{Vault, UserPosition};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut)]
    pub user: Signer<'info>,                    // The person repaying the debt

    // Ensure the UserPosition belongs to this user
    #[account(
        mut,
        constraint = user_position.owner == user.key() @ ErrorCode::InvalidOwner
    )]
    pub user_position: Account<'info, UserPosition>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn repay(ctx: Context<Repay>, repay_amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let user_position = &mut ctx.accounts.user_position;

    // 1. Validation
    require!(repay_amount > 0, ErrorCode::InvalidAmount);
    require!(user_position.borrowed_amount > 0, ErrorCode::NoDebt);

    // 2. Cap repayment
    let actual_repay = repay_amount.min(user_position.borrowed_amount);

    // 3. Calculate shares to repay (simplified version for your current struct)
    // TODO: Add total_borrowed + total_borrowed_shares to Vault later for better math
    
    let shares_to_repay = if vault.total_collateral == 0 {
        0u64
    } else {
        u128::from(actual_repay)
            .checked_mul(vault.total_shares as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(vault.total_collateral as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64
    };

    // 4. Update user position
    user_position.borrowed_amount = user_position
        .borrowed_amount
        .checked_sub(actual_repay)
        .ok_or(ErrorCode::MathOverflow)?;

    // 5. Update vault (basic version - improve later)
    vault.total_collateral = vault
        .total_collateral
        .checked_sub(actual_repay)
        .ok_or(ErrorCode::MathOverflow)?;

    // 6. Transfer tokens from user to vault
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, actual_repay)?;

    // 7. Emit event
    emit!(RepayEvent {
        user: ctx.accounts.user.key(),
        repay_amount: actual_repay,
        shares_repaid: shares_to_repay,
        remaining_borrowed: user_position.borrowed_amount,
    });

    Ok(())
}

#[event]
pub struct RepayEvent {
    pub user: Pubkey,
    pub repay_amount: u64,
    pub shares_repaid: u64,
    pub remaining_borrowed: u64,
}