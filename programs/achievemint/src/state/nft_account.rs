use anchor_lang::prelude::*;

#[account]
pub struct NFTAccount {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub rarity: String,
    pub unlock_percentage: u8,
    pub achievement_id: String,
    pub mint_timestamp: i64,
    pub bump: u8,
}