use anchor_lang::prelude::*;

declare_id!("8aMfhVJxNZeGjgDg38XwdpMqDdrsvM42RPjF67DQ8VVe");

#[program]
pub mod predict_duel {
    use super::*;

    /// Create a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_index: u64,
        question: String,
        category: MarketCategory,
        stake_amount: u64,
        deadline: i64,
        market_type: MarketType,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(
            question.len() <= 200,
            PredictDuelError::QuestionTooLong
        );
        require!(
            stake_amount >= 10_000_000, // Minimum 0.01 SOL (in lamports)
            PredictDuelError::StakeTooLow
        );
        require!(
            deadline > clock.unix_timestamp,
            PredictDuelError::InvalidDeadline
        );

        // Store bump - Anchor 0.32.1 uses struct fields
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.market_vault;

        market.creator = ctx.accounts.creator.key();
        market.market_index = market_index;
        market.question = question;
        market.category = category;
        market.stake_amount = stake_amount;
        market.deadline = deadline;
        market.market_type = market_type;
        market.status = MarketStatus::Pending;
        market.pool_size = 0;
        market.yes_count = 0;
        market.no_count = 0;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.total_participants = 0;
        market.outcome = None;
        market.created_at = clock.unix_timestamp;

        msg!("Market created: {}", market.question);
        
        Ok(())
    }

    /// Place a bet on a prediction market
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        prediction: bool, // true = yes, false = no
        stake_amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let participant = &mut ctx.accounts.participant;
        let clock = Clock::get()?;

        // Validate market is open for betting
        require!(
            market.status == MarketStatus::Pending || market.status == MarketStatus::Active,
            PredictDuelError::MarketNotActive
        );
        require!(
            clock.unix_timestamp < market.deadline,
            PredictDuelError::MarketExpired
        );
        require!(
            stake_amount >= 10_000_000, // Minimum 0.01 SOL
            PredictDuelError::StakeTooLow
        );

        // Transfer SOL from bettor to market vault
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.bettor.to_account_info(),
                    to: ctx.accounts.market_vault.to_account_info(),
                },
            ),
            stake_amount,
        )?;

        // Initialize or update participant account
        if participant.market == Pubkey::default() {
            participant.market = market.key();
            participant.bettor = ctx.accounts.bettor.key();
            participant.prediction = prediction;
            participant.stake = stake_amount;
            participant.claimed = false;
            // Store bump - Anchor 0.32.1 uses struct fields
            participant.bump = ctx.bumps.participant;
            
            market.total_participants += 1;
        } else {
            // Add to existing stake
            participant.stake += stake_amount;
        }

        // Update market stats
        market.pool_size += stake_amount;
        if prediction {
            market.yes_count += 1;
            market.yes_pool += stake_amount;
        } else {
            market.no_count += 1;
            market.no_pool += stake_amount;
        }

        // Activate market if it was pending
        if market.status == MarketStatus::Pending {
            market.status = MarketStatus::Active;
        }

        msg!(
            "Bet placed: {} SOL on {}",
            stake_amount as f64 / 1_000_000_000.0,
            if prediction { "YES" } else { "NO" }
        );

        Ok(())
    }

    /// Resolve the market with the final outcome
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool, // true = yes, false = no
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        // Only creator or designated resolver can resolve
        require!(
            ctx.accounts.resolver.key() == market.creator,
            PredictDuelError::UnauthorizedResolver
        );

        // Market must be active and past deadline
        require!(
            market.status == MarketStatus::Active,
            PredictDuelError::MarketNotActive
        );
        require!(
            clock.unix_timestamp >= market.deadline,
            PredictDuelError::MarketNotExpired
        );

        market.status = MarketStatus::Resolved;
        market.outcome = Some(outcome);

        msg!(
            "Market resolved: Outcome is {}",
            if outcome { "YES" } else { "NO" }
        );

        Ok(())
    }

    /// Claim winnings after market is resolved
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let participant = &mut ctx.accounts.participant;

        // Validate market is resolved
        require!(
            market.status == MarketStatus::Resolved,
            PredictDuelError::MarketNotResolved
        );
        require!(
            !participant.claimed,
            PredictDuelError::AlreadyClaimed
        );

        let outcome = market.outcome.ok_or(PredictDuelError::NoOutcome)?;

        // Check if participant won
        let won = participant.prediction == outcome;
        require!(won, PredictDuelError::NotAWinner);

        // Calculate payout based on proportional share of winning pool
        let winning_pool_stake = if outcome {
            market.yes_pool
        } else {
            market.no_pool
        };

        require!(
            winning_pool_stake > 0,
            PredictDuelError::MarketNotActive
        );

        // Payout = (participant_stake / winning_pool_stake) * total_pool
        // Use u128 to prevent overflow
        let payout = ((participant.stake as u128)
            .checked_mul(market.pool_size as u128)
            .ok_or(PredictDuelError::MarketNotActive)?
            .checked_div(winning_pool_stake as u128)
            .ok_or(PredictDuelError::MarketNotActive)?) as u64;
        
        // Validate payout is positive
        require!(
            payout > 0,
            PredictDuelError::MarketNotActive
        );
        
        // Ensure vault has sufficient balance (account for rent exemption)
        let vault_balance = ctx.accounts.market_vault.lamports();
        require!(
            vault_balance >= payout,
            PredictDuelError::MarketNotActive
        );

        // Transfer winnings from vault to winner
        // Use the vault's bump that Anchor validated (more reliable than stored value)
        let seeds = &[
            b"market_vault",
            market.creator.as_ref(),
            &market.market_index.to_le_bytes(),
            &[ctx.bumps.market_vault],
        ];
        let signer = &[&seeds[..]];

        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.market_vault.to_account_info(),
                    to: ctx.accounts.winner.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;

        participant.claimed = true;

        msg!(
            "Winnings claimed: {} SOL",
            payout as f64 / 1_000_000_000.0
        );

        Ok(())
    }

    /// Cancel market (only if no participants or before deadline by creator)
    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;

        require!(
            ctx.accounts.creator.key() == market.creator,
            PredictDuelError::UnauthorizedResolver
        );
        require!(
            market.status == MarketStatus::Pending,
            PredictDuelError::CannotCancel
        );
        require!(
            market.total_participants == 0,
            PredictDuelError::CannotCancel
        );

        market.status = MarketStatus::Cancelled;

        msg!("Market cancelled");

        Ok(())
    }

    /// Refund participants if market is cancelled
    pub fn refund_stake(ctx: Context<RefundStake>) -> Result<()> {
        let market = &ctx.accounts.market;
        let participant = &mut ctx.accounts.participant;

        require!(
            market.status == MarketStatus::Cancelled,
            PredictDuelError::MarketNotCancelled
        );
        require!(
            !participant.claimed,
            PredictDuelError::AlreadyClaimed
        );

        let refund_amount = participant.stake;

        // Transfer refund from vault to participant
        // Use the vault's bump that Anchor validated (more reliable than stored value)
        let seeds = &[
            b"market_vault",
            market.creator.as_ref(),
            &market.market_index.to_le_bytes(),
            &[ctx.bumps.market_vault],
        ];
        let signer = &[&seeds[..]];

        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.market_vault.to_account_info(),
                    to: ctx.accounts.bettor.to_account_info(),
                },
                signer,
            ),
            refund_amount,
        )?;

        participant.claimed = true;

        msg!(
            "Stake refunded: {} SOL",
            refund_amount as f64 / 1_000_000_000.0
        );

        Ok(())
    }
}

// Account validation structs
#[derive(Accounts)]
#[instruction(market_index: u64)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 8 + (4 + 200) + 1 + 8 + 8 + 1 + 1 + 8 + 4 + 4 + 8 + 8 + 4 + 1 + 8 + 1 + 1,
        seeds = [
            b"market",
            creator.key().as_ref(),
            &market_index.to_le_bytes()
        ],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// System account vault that holds all stakes - no data, just lamports
    /// CHECK: PDA validated via seeds, owner checked to be system program
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [
            b"market_vault",
            creator.key().as_ref(),
            &market_index.to_le_bytes()
        ],
        bump,
        owner = system_program.key()
    )]
    pub market_vault: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init_if_needed,
        payer = bettor,
        space = 8 + 32 + 32 + 1 + 8 + 1 + 1,
        seeds = [b"participant", market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    /// System account vault that holds all stakes
    /// CHECK: PDA validated via seeds, owner checked to be system program
    #[account(
        mut,
        seeds = [
            b"market_vault",
            market.creator.as_ref(),
            &market.market_index.to_le_bytes()
        ],
        bump,
        owner = system_program.key()
    )]
    pub market_vault: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"participant", market.key().as_ref(), winner.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(mut)]
    pub winner: Signer<'info>,
    
    /// System account vault that holds all stakes
    /// CHECK: PDA validated via seeds, owner checked to be system program
    #[account(
        mut,
        seeds = [
            b"market_vault",
            market.creator.as_ref(),
            &market.market_index.to_le_bytes()
        ],
        bump,
        owner = system_program.key()
    )]
    pub market_vault: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefundStake<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"participant", market.key().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(mut)]
    pub bettor: Signer<'info>,
    
    /// System account vault that holds all stakes
    /// CHECK: PDA validated via seeds, owner checked to be system program
    #[account(
        mut,
        seeds = [
            b"market_vault",
            market.creator.as_ref(),
            &market.market_index.to_le_bytes()
        ],
        bump,
        owner = system_program.key()
    )]
    pub market_vault: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

// State structs
#[account]
pub struct Market {
    pub creator: Pubkey,
    pub market_index: u64,
    pub question: String,
    pub category: MarketCategory,
    pub stake_amount: u64,
    pub deadline: i64,
    pub market_type: MarketType,
    pub status: MarketStatus,
    pub pool_size: u64,
    pub yes_count: u32,
    pub no_count: u32,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub total_participants: u32,
    pub outcome: Option<bool>,
    pub created_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
pub struct Participant {
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub prediction: bool,
    pub stake: u64,
    pub claimed: bool,
    pub bump: u8,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketCategory {
    Crypto,
    Weather,
    Sports,
    Meme,
    Local,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketType {
    Public,
    Challenge,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Pending,
    Active,
    Resolved,
    Cancelled,
}

// Errors
#[error_code]
pub enum PredictDuelError {
    #[msg("Question exceeds 200 characters")]
    QuestionTooLong,
    #[msg("Stake amount must be at least 0.01 SOL")]
    StakeTooLow,
    #[msg("Deadline must be in the future")]
    InvalidDeadline,
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market has expired")]
    MarketExpired,
    #[msg("Only the creator can resolve this market")]
    UnauthorizedResolver,
    #[msg("Market has not expired yet")]
    MarketNotExpired,
    #[msg("Market is not resolved yet")]
    MarketNotResolved,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("No outcome set for market")]
    NoOutcome,
    #[msg("You did not win this market")]
    NotAWinner,
    #[msg("Cannot cancel market with active participants")]
    CannotCancel,
    #[msg("Market is not cancelled")]
    MarketNotCancelled,
}