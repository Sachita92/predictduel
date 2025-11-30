# Quick Deployment Steps

## Step 1: Create Solana Wallet (if needed)

```bash
# Create a new keypair (wallet)
solana-keygen new -o /root/.config/solana/id.json

# When prompted, you can:
# - Press Enter to skip passphrase (for devnet testing)
# - Or set a passphrase for security
```

## Step 2: Get Your Wallet Address

```bash
# Check your wallet address
solana address

# This will show your public key (wallet address)
```

## Step 3: Request Airdrop (Get Free SOL)

```bash
# Request 2 SOL (enough for deployment)
solana airdrop 2

# Verify you received it
solana balance
```

## Step 4: Deploy the Program

```bash
# Make sure you're on devnet
solana config set --url devnet

# Deploy using Anchor
anchor deploy --provider.cluster devnet
```

## Step 5: Get Your Program ID

```bash
# Get the Program ID
solana address -k target/deploy/predict_duel-keypair.json

# Save this Program ID - you'll need it for your frontend!
```

## Step 6: Verify Deployment

```bash
# Check program is deployed
solana program show <YOUR_PROGRAM_ID>

# Or use the Makefile command
make verify
```

## Troubleshooting

**If airdrop fails:**
```bash
# Try requesting from a specific faucet
solana airdrop 2 --url https://api.devnet.solana.com
```

**If deployment fails due to low balance:**
```bash
# Request more SOL
solana airdrop 2
solana balance
```

**If you need to check your current config:**
```bash
solana config get
```

