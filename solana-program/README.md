# PredictDuel Solana Program

A decentralized prediction market smart contract built on Solana using the Anchor framework.

## 🎯 Features

- **Create Prediction Markets**: Anyone can create a yes/no prediction market with a question, stake, and deadline
- **Place Bets**: Users can stake SOL on YES or NO outcomes
- **Decentralized Resolution**: Market creators resolve outcomes after the deadline
- **Automatic Payouts**: Winners can claim their proportional share of the pool
- **Market Cancellation**: Creators can cancel markets with no participants and refund stakes

## 🏗️ Architecture

### Program Structure

```
solana-program/
├── programs/
│   └── predict-duel/
│       └── src/
│           └── lib.rs          # Main program logic
├── tests/
│   └── predict-duel.ts         # Integration tests
├── client/
│   └── sdk.ts                  # TypeScript SDK
└── scripts/
    └── deploy.sh               # Deployment script
```

### Key Instructions

1. **create_market** - Create a new prediction market
2. **place_bet** - Place a bet on YES or NO
3. **resolve_market** - Resolve the market outcome
4. **claim_winnings** - Claim winnings after resolution
5. **cancel_market** - Cancel market before any bets
6. **refund_stake** - Refund stakes from cancelled markets

### Account Structure

#### Market Account
```rust
pub struct Market {
    pub creator: Pubkey,           // Market creator
    pub question: String,          // Prediction question (max 200 chars)
    pub category: MarketCategory,  // Crypto, Sports, etc.
    pub stake_amount: u64,         // Minimum stake in lamports
    pub deadline: i64,             // Unix timestamp
    pub market_type: MarketType,   // Public or Challenge
    pub status: MarketStatus,      // Pending, Active, Resolved, Cancelled
    pub pool_size: u64,            // Total SOL in pool
    pub yes_count: u32,            // Number of YES bets
    pub no_count: u32,             // Number of NO bets
    pub total_participants: u32,   // Total unique participants
    pub outcome: Option<bool>,     // Final outcome (true=YES, false=NO)
    pub created_at: i64,           // Creation timestamp
    pub bump: u8,                  // PDA bump
}
```

#### Participant Account
```rust
pub struct Participant {
    pub market: Pubkey,      // Market this participant is in
    pub bettor: Pubkey,      // Participant's wallet
    pub prediction: bool,    // true = YES, false = NO
    pub stake: u64,          // Amount staked
    pub claimed: bool,       // Whether winnings claimed
    pub bump: u8,            // PDA bump
}
```

## 🚀 Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (1.70+)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (1.17+)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation) (0.29+)
- [Node.js](https://nodejs.org/) (16+)

### Installation

1. **Install Rust**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Install Solana CLI**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

3. **Install Anchor**
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

4. **Install Dependencies**
```bash
npm install
# or
yarn install
```

### Build

```bash
anchor build
```

This will generate:
- Program binary in `target/deploy/`
- IDL in `target/idl/`
- TypeScript types in `target/types/`

### Test

```bash
anchor test
```

Run tests on localnet:
```bash
anchor test --skip-local-validator
```

### Deploy

#### Deploy to Devnet
```bash
./scripts/deploy.sh devnet
```

#### Deploy to Mainnet
```bash
./scripts/deploy.sh mainnet
```

## 📚 Usage

### TypeScript SDK

```typescript
import { PredictDuelClient, MarketCategory, MarketType } from './client/sdk';
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const wallet = new anchor.Wallet(Keypair.generate());
const programId = new PublicKey('YOUR_PROGRAM_ID');

const client = new PredictDuelClient(connection, wallet, programId);

// Create a market
const { signature, marketPda } = await client.createMarket({
  question: 'Will Bitcoin hit $100K by end of 2024?',
  category: MarketCategory.Crypto,
  stakeAmount: PredictDuelClient.solToLamports(0.1), // 0.1 SOL
  deadline: new Date('2024-12-31'),
  marketType: MarketType.Public,
});

// Place a bet
const { signature: betSig } = await client.placeBet({
  marketPda,
  prediction: true, // YES
  stakeAmount: PredictDuelClient.solToLamports(0.1),
});

// Resolve market (after deadline, by creator)
await client.resolveMarket(marketPda, true); // Outcome: YES

// Claim winnings
await client.claimWinnings(marketPda);

// Get market data
const marketData = await client.getMarket(marketPda);
console.log('Pool size:', PredictDuelClient.lamportsToSol(marketData.poolSize), 'SOL');
```

## 🔐 Security Considerations

1. **Market Resolution**: Currently only the creator can resolve markets. Consider implementing:
   - Oracle integration for automated resolution
   - Multi-sig or DAO-based resolution
   - Dispute mechanism

2. **Front-running Protection**: Consider adding:
   - Commit-reveal schemes for bets
   - Time-locks between market creation and first bet

3. **Economic Attacks**: 
   - Minimum stake requirements prevent dust attacks
   - Consider adding maximum stakes or pool caps

4. **Reentrancy**: Anchor's account validation prevents reentrancy attacks

## 🧪 Testing

The test suite includes:
- Market creation with various parameters
- Betting on both YES and NO outcomes
- Resolution after deadline
- Claiming winnings
- Market cancellation and refunds
- Error cases (unauthorized access, invalid timing, etc.)

Run with verbose output:
```bash
anchor test -- --nocapture
```

## 📖 API Reference

### Instructions

#### `create_market`
Creates a new prediction market.

**Parameters:**
- `question: String` - The prediction question (max 200 characters)
- `category: MarketCategory` - Category (Crypto, Weather, Sports, Meme, Local, Other)
- `stake_amount: u64` - Minimum stake in lamports (min 0.01 SOL)
- `deadline: i64` - Unix timestamp for market expiry
- `market_type: MarketType` - Public or Challenge

**Accounts:**
- `market` - Market PDA to initialize
- `creator` - Signer and market creator
- `market_vault` - PDA to hold stakes
- `system_program` - Solana system program

#### `place_bet`
Place a bet on a prediction market.

**Parameters:**
- `prediction: bool` - true for YES, false for NO
- `stake_amount: u64` - Amount to stake in lamports

**Accounts:**
- `market` - Market account
- `participant` - Participant PDA
- `bettor` - Signer placing the bet
- `market_vault` - Vault to receive stake
- `system_program` - Solana system program

#### `resolve_market`
Resolve the market with the final outcome.

**Parameters:**
- `outcome: bool` - Final outcome (true = YES, false = NO)

**Accounts:**
- `market` - Market account
- `resolver` - Signer (must be creator)

#### `claim_winnings`
Claim winnings from a resolved market.

**Accounts:**
- `market` - Resolved market
- `participant` - Participant account
- `winner` - Signer claiming winnings
- `market_vault` - Vault holding winnings
- `system_program` - Solana system program

## 🛣️ Roadmap

- [ ] Oracle integration for automated resolution
- [ ] NFT receipts for participants
- [ ] Governance token for protocol upgrades
- [ ] Fee mechanism and treasury
- [ ] Multi-outcome markets (beyond yes/no)
- [ ] Time-weighted betting (earlier bets get bonuses)
- [ ] Market discovery and indexing service

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Join our Discord community
- Email: support@predictduel.com

## 🔗 Links

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)

