use anchor_lang::prelude::*;

#[account]
pub struct AchievemintAuthority {
    pub authority: Pubkey,
    pub bump: u8,
}