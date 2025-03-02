use anchor_lang::prelude::*;
use crate::state::NFTAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct BurnNFT<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        close = owner,
        seeds = [b"nft", owner.key().as_ref(), nft_account.achievement_id.as_bytes()],
        bump = nft_account.bump,
    )]
    pub nft_account: Account<'info, NFTAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BurnNFT>) -> Result<()> {
    let nft_account = &ctx.accounts.nft_account;
    let owner = &ctx.accounts.owner;

    require!(nft_account.owner == owner.key(), ErrorCode::NotOwner);
    
    // The NFT account will be closed and the rent will be returned to the owner
    msg!("NFT burned successfully!");
    Ok(())
}