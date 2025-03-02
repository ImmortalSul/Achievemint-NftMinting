use anchor_lang::prelude::*;
use crate::state::{AchievemintAuthority, NFTAccount};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(
    name: String,
    description: String,
    rarity: String,
    unlock_percentage: u8,
    achievement_id: String,
)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        seeds = [b"achievemint-authority"],
        bump = achievemint_authority.bump,
    )]
    pub achievemint_authority: Account<'info, AchievemintAuthority>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 200 + 20 + 1 + 50 + 8 + 1, // discriminator + pubkey + name + description + rarity + unlock_percentage + achievement_id + timestamp + bump
        seeds = [b"nft", payer.key().as_ref(), achievement_id.as_bytes()],
        bump
    )]
    pub nft_account: Account<'info, NFTAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<MintNFT>,
    name: String,
    description: String,
    rarity: String,
    unlock_percentage: u8,
    achievement_id: String,
) -> Result<()> {
    let nft_account = &mut ctx.accounts.nft_account;
    let _payer = &ctx.accounts.payer;

    // Validate input
    require!(name.len() <= 32, ErrorCode::NameTooLong);
    require!(description.len() <= 200, ErrorCode::DescriptionTooLong);
    require!(rarity.len() <= 20, ErrorCode::RarityTooLong);
    require!(unlock_percentage <= 100, ErrorCode::InvalidUnlockPercentage);
    require!(achievement_id.len() <= 50, ErrorCode::AchievementIdTooLong);
    
    // Create NFT data
    nft_account.description = description;
    nft_account.rarity = rarity;
    nft_account.unlock_percentage = unlock_percentage;
    nft_account.achievement_id = achievement_id;
    nft_account.mint_timestamp = Clock::get()?.unix_timestamp;
    nft_account.bump = ctx.bumps.nft_account;

    msg!("NFT minted successfully!");
    Ok(())
}