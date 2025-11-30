# Deployment Guide

> 📖 **New to PredictDuel?** Read [CONCEPT.md](./CONCEPT.md) first to understand how everything works!

## Prerequisites
- Solana CLI installed and configured
- Anchor CLI installed
- Wallet with sufficient SOL balance

## Which Network Should I Use?

**For first-time deployment:** Use **Devnet** (recommended)
- Free SOL available via airdrop
- Real blockchain environment
- Public and shareable
- No real money at risk

**For fast development:** Use **Localnet**
- Fastest (runs locally)
- Requires running `solana-test-validator` separately
- Only accessible on your machine

See [CONCEPT.md](./CONCEPT.md) for detailed comparison.

## Deploy to Devnet

1. **Set cluster to devnet:**
   ```bash
   solana config set --url devnet
   ```

2. **Check wallet balance:**
   ```bash
   solana balance
   ```

3. **Request airdrop if needed (devnet only):**
   ```bash
   solana airdrop 2
   ```

4. **Deploy using Anchor:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

   Or use the deployment script:
   ```bash
   ./scripts/deploy.sh devnet
   ```

## Deploy to Localnet

1. **Start local validator (in a separate terminal):**
   ```bash
   solana-test-validator
   ```

2. **Set cluster to localnet:**
   ```bash
   solana config set --url localhost
   ```

3. **Request airdrop:**
   ```bash
   solana airdrop 2
   ```

4. **Deploy:**
   ```bash
   anchor deploy --provider.cluster localnet
   ```

   Or use the deployment script:
   ```bash
   ./scripts/deploy.sh localnet
   ```

## Verify Deployment

After deployment, verify with:
```bash
solana program show <PROGRAM_ID>
```

Get your program ID:
```bash
solana address -k target/deploy/predict_duel-keypair.json
```

## Quick Commands

Using the Makefile:
```bash
make deploy-devnet    # Deploy to devnet
make deploy-localnet  # Deploy to localnet
make verify           # Verify deployment
make program-id       # Show program ID
make balance          # Check wallet balance
make airdrop          # Request airdrop (devnet)
```

