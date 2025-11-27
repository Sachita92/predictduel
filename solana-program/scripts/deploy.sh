#!/bin/bash

# PredictDuel Solana Program Deployment Script

set -e

echo "🚀 Starting PredictDuel deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}Error: Anchor CLI is not installed${NC}"
    echo "Install it with: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    exit 1
fi

# Check if Solana is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI is not installed${NC}"
    echo "Install it from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Parse command line arguments
NETWORK=${1:-devnet}

case $NETWORK in
  localnet)
    echo -e "${YELLOW}Deploying to localnet...${NC}"
    CLUSTER="localnet"
    ;;
  devnet)
    echo -e "${YELLOW}Deploying to devnet...${NC}"
    CLUSTER="devnet"
    ;;
  mainnet)
    echo -e "${YELLOW}⚠️  Deploying to MAINNET...${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Deployment cancelled"
      exit 0
    fi
    CLUSTER="mainnet-beta"
    ;;
  *)
    echo -e "${RED}Invalid network: $NETWORK${NC}"
    echo "Usage: ./deploy.sh [localnet|devnet|mainnet]"
    exit 1
    ;;
esac

# Set Solana cluster
solana config set --url $CLUSTER

# Check wallet balance
echo -e "${YELLOW}Checking wallet balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${RED}Warning: Low balance. You need at least 2 SOL for deployment${NC}"
    if [ "$CLUSTER" == "devnet" ]; then
        echo "Run: solana airdrop 2"
        read -p "Request airdrop now? (yes/no): " airdrop
        if [ "$airdrop" == "yes" ]; then
            solana airdrop 2
        fi
    fi
fi

# Build the program
echo -e "${YELLOW}Building program...${NC}"
anchor build

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/predict_duel-keypair.json)
echo -e "${GREEN}Program ID: $PROGRAM_ID${NC}"

# Update Anchor.toml with the program ID
echo -e "${YELLOW}Updating Anchor.toml...${NC}"
sed -i.bak "s/predict_duel = \".*\"/predict_duel = \"$PROGRAM_ID\"/" Anchor.toml

# Deploy the program
echo -e "${YELLOW}Deploying program to $CLUSTER...${NC}"
anchor deploy --provider.cluster $CLUSTER

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
DEPLOYED_PROGRAM=$(solana program show $PROGRAM_ID --output json | jq -r '.programId')

if [ "$DEPLOYED_PROGRAM" == "$PROGRAM_ID" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "═══════════════════════════════════════"
    echo "  Program ID: $PROGRAM_ID"
    echo "  Network: $CLUSTER"
    echo "═══════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo "1. Update your frontend with the program ID"
    echo "2. Test the program with: anchor test"
    echo "3. View on explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=$CLUSTER"
else
    echo -e "${RED}❌ Deployment verification failed${NC}"
    exit 1
fi

