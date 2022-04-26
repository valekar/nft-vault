use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("FxRTvSFtd2AJP9rDvpeGLtSJ43KhKSm61C1Z8Y7Rajbv");

#[program]
pub mod nft_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let nft_vault = &mut ctx.accounts.nft_vault;
        nft_vault.authority = ctx.accounts.authority.key();
        nft_vault.bump = *ctx.bumps.get("nft_vault").unwrap();
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        let stake_nft = &mut ctx.accounts.stake_nft;
        stake_nft.bump = *ctx.bumps.get("stake_nft").unwrap();
        stake_nft.staker = ctx.accounts.staker.key();
        stake_nft.mint = ctx.accounts.token_mint.key();

        let token_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                authority: ctx.accounts.staker.to_account_info(),
                from: ctx.accounts.staker_ata.to_account_info(),
                to: ctx.accounts.nft_vault_ata.to_account_info(),
            },
        );
        token::transfer(token_ctx, 1)?;
        Ok(())
    }

    // user unstake 
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.token_mint.key(),
            ctx.accounts.stake_nft.mint,
            NftError::MintMismatch
        );

        require_keys_eq!(
            ctx.accounts.stake_nft.staker,
            ctx.accounts.staker.key(),
            NftError::KeyMismatch
        );

        let nft_vault_bump = ctx.accounts.nft_vault.bump;
        let seeds = &[b"nft-vault".as_ref(), &[nft_vault_bump]];
        let signer =  &[&seeds[..]];

        let token_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                authority: ctx.accounts.nft_vault.to_account_info(),
                from: ctx.accounts.nft_vault_ata.to_account_info(),
                to: ctx.accounts.staker_ata.to_account_info(),
            },
            signer,
        );
        token::transfer(token_ctx, 1)?;

        Ok(())
    }

    // authority could release to user
    pub fn release(ctx: Context<Release>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.nft_vault.authority,
            ctx.accounts.authority.key(),
            NftError::Unauthorized
        );

        require_keys_eq!(
            ctx.accounts.token_mint.key(),
            ctx.accounts.stake_nft.mint,
            NftError::MintMismatch
        );

        require_keys_eq!(
            ctx.accounts.stake_nft.staker,
            ctx.accounts.staker.key(),
            NftError::KeyMismatch
        );

        let nft_vault_bump = ctx.accounts.nft_vault.bump;
        let seeds = &[b"nft-vault".as_ref(), &[nft_vault_bump]];
        let signer =  &[&seeds[..]];

        let token_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                authority: ctx.accounts.nft_vault.to_account_info(),
                from: ctx.accounts.nft_vault_ata.to_account_info(),
                to: ctx.accounts.staker_ata.to_account_info(),
            },
            signer,
        );
        token::transfer(token_ctx, 1)?;

        Ok(())
    }
}

// Accounts

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        space = 8 + NftVault::LEN,
        seeds =[
            b"nft-vault".as_ref(),
        ],
        bump,
        payer = authority,

    )]
    pub nft_vault: Account<'info, NftVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        init, 
        space = 8 + StakeNft::LEN,
        payer = staker,
        seeds = [
            b"user-stake".as_ref(),
            token_mint.key().as_ref(),
            staker.key().as_ref()
        ],
        bump
    )]
    pub stake_nft: Account<'info, StakeNft>,

    #[account(
        seeds = [
            b"nft-vault".as_ref()
        ],
        bump = nft_vault.bump
    )]
    pub nft_vault: Account<'info, NftVault>,

    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub staker_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = staker,
        associated_token::mint = token_mint,
        associated_token::authority = nft_vault,
    )]
    pub nft_vault_ata: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"user-stake".as_ref(),
            token_mint.key().as_ref(),
            staker.key().as_ref()
        ],
        bump = stake_nft.bump,
        close = staker
    )]
    pub stake_nft: Account<'info, StakeNft>,

    #[account(
        seeds = [
            b"nft-vault".as_ref()
        ],
        bump = nft_vault.bump
    )]
    pub nft_vault: Account<'info, NftVault>,

    pub token_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = staker,
        associated_token::mint = token_mint,
        associated_token::authority = staker,
    )]
    pub staker_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = nft_vault,
    )]
    pub nft_vault_ata: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds =[
            b"nft-vault".as_ref(),
        ],
        bump = nft_vault.bump,
    )]
    pub nft_vault: Account<'info, NftVault>,

    #[account(
        mut,
        seeds = [
            b"user-stake".as_ref(),
            token_mint.key().as_ref(),
            staker.key().as_ref()
        ],
        bump = stake_nft.bump,
        close = authority
    )]
    pub stake_nft: Account<'info, StakeNft>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = staker,
    )]
    pub staker_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = nft_vault,
    )]
    pub nft_vault_ata: Account<'info, TokenAccount>,

    /// CHECK : staker.payer should be equal to the user
    #[account(constraint = staker.key() == stake_nft.staker @NftError::Unauthorized )]
    pub staker: AccountInfo<'info>,

    pub token_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}



//State
#[account]
pub struct NftVault {
    pub authority: Pubkey,     //32
    pub bump: u8,              // 1
    pub total_nft_stakes: u64, // 16
}

impl NftVault {
    pub const LEN: usize = 1 + 32 + 16;
}

#[account]
pub struct StakeNft {
    pub bump: u8,       // 1
    pub staker: Pubkey, // 32,
    pub mint: Pubkey,   // 32
}

impl StakeNft {
    pub const LEN: usize = 1 + 32 + 32;
}


//error

#[error_code]
pub enum NftError {
    #[msg("Keys should be equal")]
    KeyMismatch,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Mint should be equal")]
    MintMismatch,
    #[msg("Authority should be equal")]
    AccountMismatch
}