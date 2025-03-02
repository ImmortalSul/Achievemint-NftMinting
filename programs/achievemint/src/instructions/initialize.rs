use anchor_lang::prelude::*;
use crate::state::AchievemintAuthority;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1, // discriminator + pubkey + bump
        seeds = [b"achievemint-authority"],
        bump
    )]
    pub achievemint_authority: Account<'info, AchievemintAuthority>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let achievemint_authority = &mut ctx.accounts.achievemint_authority;
    achievemint_authority.authority = ctx.accounts.authority.key();
    achievemint_authority.bump = ctx.bumps.achievemint_authority;
    
    msg!("Achievemint program initialized successfully!");
    Ok(())
}