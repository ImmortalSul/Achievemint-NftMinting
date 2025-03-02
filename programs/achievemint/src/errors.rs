use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Name is too long, must be <= 32 chars")]
    NameTooLong,
    #[msg("Description is too long, must be <= 200 chars")]
    DescriptionTooLong,
    #[msg("Rarity is too long, must be <= 20 chars")]
    RarityTooLong,
    #[msg("Unlock percentage must be between 0 and 100")]
    InvalidUnlockPercentage,
    #[msg("Achievement ID is too long, must be <= 50 chars")]
    AchievementIdTooLong,
    #[msg("Not the owner of this NFT")]
    NotOwner,
}