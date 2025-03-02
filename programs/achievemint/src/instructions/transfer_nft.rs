use anchor_lang::prelude::*;
use crate::state::NFTAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct TransferNFT<'info> {
    #[account(mut)]
    pub current_owner: Signer<'info>,
    
    /// CHECK: This is the new owner, we're just reading their pubkey
    pub new_owner: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"nft", nft_account.owner.as_ref(), nft_account.achievement_id.as_bytes()],
        bump = nft_account.bump,
    )]
    pub nft_account: Account<'info, NFTAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TransferNFT>) -> Result<()> {
    let nft_account = &mut ctx.accounts.nft_account;
    let current_owner = &ctx.accounts.current_owner;
    let new_owner = &ctx.accounts.new_owner;

    require!(nft_account.owner == current_owner.key(), ErrorCode::NotOwner);
    
    nft_account.owner = new_owner.key();
    
    msg!("NFT transferred successfully!");
    Ok(())
}