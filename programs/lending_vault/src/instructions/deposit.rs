use anchor_lang::prelude::*;
use  anchor_spl::token::{self, Token, TokenAccount, Mint};
use crate::state::{Vault, UserPosition};
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user:Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump    
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut,seeds=[b"user_position", user.key().as_ref()], bump)]
    pub user_position: Account<'info, UserPosition>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn deposit(ctx:Context<Deposit>,amount:u64)->Result<()>{
    require!(amount > 0, ErrorCode::InvalidAmount);

    let user_position = &mut ctx.accounts.user_position;
    let vault = &mut ctx.accounts.vault;

    // Transfer user's tokens to vault

    let cpi_accounts=token::Transfer{
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(cpi_accounts, cpi_program)?;

    // Update vault and user position state
    if user_position.owner == Pubkey::default(){
        // First time depositor, initialize position
        user_position.owner = *ctx.accounts.user.key;
        user_position.deposited_amount = amount;
        user_position.borrowed_amount = 0;
        user_position.shares = amount; // 1:1 shares for simplicity
        user_position.last_update = ctx.accounts.clock.unix_timestamp;
        user_position.bump = ctx.bumps.user_position;
    }else{
        //addtional deposit, update existing position
        user_position.deposited_amount += amount;
        user_position.shares += amount; // 1:1 shares for simplicity
        user_position.last_update = ctx.accounts.clock.unix_timestamp;
    }

    //update global vault state
    vault.total_collateral += amount;
    vault.total_shares += amount; // 1:1 shares for simplicity
    user_position.last_update = ctx.accounts.clock.unix_timestamp;
    msg!("Deposit successful: {} lamports", amount);
    Ok(())
}