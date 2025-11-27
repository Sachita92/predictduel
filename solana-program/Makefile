# PredictDuel Solana Program Makefile
# Convenient commands for development and deployment

.PHONY: help install build test clean deploy-devnet deploy-mainnet verify lint format

help: ## Show this help message
	@echo "PredictDuel Solana Program"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed"

build: ## Build the Solana program
	@echo "🏗️  Building program..."
	anchor build
	@echo "✅ Build complete"

test: ## Run tests
	@echo "🧪 Running tests..."
	anchor test
	@echo "✅ Tests complete"

test-skip-build: ## Run tests without building
	@echo "🧪 Running tests (skip build)..."
	anchor test --skip-build
	@echo "✅ Tests complete"

clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf target/
	rm -rf .anchor/
	rm -rf node_modules/
	@echo "✅ Clean complete"

deploy-localnet: build ## Deploy to localnet
	@echo "🚀 Deploying to localnet..."
	./scripts/deploy.sh localnet

deploy-devnet: build ## Deploy to devnet
	@echo "🚀 Deploying to devnet..."
	./scripts/deploy.sh devnet

deploy-mainnet: build ## Deploy to mainnet (use with caution!)
	@echo "⚠️  Deploying to MAINNET..."
	./scripts/deploy.sh mainnet

verify: ## Verify program deployment
	@echo "🔍 Verifying program..."
	solana program show $$(solana address -k target/deploy/predict_duel-keypair.json)

program-id: ## Display program ID
	@solana address -k target/deploy/predict_duel-keypair.json

balance: ## Check wallet balance
	@solana balance

airdrop: ## Request airdrop (devnet only)
	@echo "💰 Requesting airdrop..."
	solana airdrop 2
	@solana balance

lint: ## Run linter
	@echo "🔍 Running linter..."
	cargo clippy -- -D warnings

format: ## Format code
	@echo "✨ Formatting code..."
	cargo fmt

watch: ## Watch for changes and rebuild
	@echo "👀 Watching for changes..."
	cargo watch -x build

logs: ## Stream program logs
	@echo "📜 Streaming logs for program..."
	solana logs $$(solana address -k target/deploy/predict_duel-keypair.json)

cluster-info: ## Show current cluster configuration
	@echo "🌐 Cluster Configuration:"
	@solana config get

set-devnet: ## Set cluster to devnet
	@solana config set --url devnet
	@echo "✅ Switched to devnet"

set-mainnet: ## Set cluster to mainnet
	@solana config set --url mainnet-beta
	@echo "✅ Switched to mainnet"

set-localnet: ## Set cluster to localnet
	@solana config set --url localhost
	@echo "✅ Switched to localnet"

start-validator: ## Start local validator
	@echo "🏃 Starting local validator..."
	solana-test-validator

idl: ## Generate and copy IDL
	@echo "📄 Generating IDL..."
	anchor build
	@cp target/idl/predict_duel.json public/idl/
	@echo "✅ IDL copied to public/idl/"

sdk: ## Build TypeScript SDK
	@echo "📦 Building TypeScript SDK..."
	cd client && npm run build
	@echo "✅ SDK built"

docs: ## Generate documentation
	@echo "📚 Generating documentation..."
	cargo doc --no-deps --open

upgrade: ## Upgrade deployed program
	@echo "⬆️  Upgrading program..."
	anchor upgrade target/deploy/predict_duel.so --program-id $$(solana address -k target/deploy/predict_duel-keypair.json)

size: ## Show program size
	@echo "📊 Program size:"
	@du -h target/deploy/predict_duel.so

all: clean install build test ## Clean, install, build, and test
	@echo "✅ All tasks complete!"

