use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("5SMBZMjXcW3r8tX25cMANwsSq5nFCBYAuFr8xNagDnA1");

#[program]
pub mod achievemint {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn mint_nft(
        ctx: Context<MintNFT>,
        name: String,
        description: String,
        rarity: String,
        unlock_percentage: u8,
        achievement_id: String,
    ) -> Result<()> {
        instructions::mint_nft::handler(ctx, name, description, rarity, unlock_percentage, achievement_id)
    }

    pub fn transfer_nft(ctx: Context<TransferNFT>) -> Result<()> {
        instructions::transfer_nft::handler(ctx)
    }

    pub fn burn_nft(ctx: Context<BurnNFT>) -> Result<()> {
        instructions::burn_nft::handler(ctx)
    }
}