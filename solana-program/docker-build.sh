#!/bin/bash

# Docker build script for Anchor Solana program
# This script builds the program inside a Docker container with proper Rust/Anchor versions

set -e

echo "🐳 Building Anchor program in Docker..."

# Determine which docker compose command to use
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE=""
fi

# Check if docker-compose.yml exists and use docker compose if available
if [ -n "$DOCKER_COMPOSE" ] && [ -f "docker-compose.yml" ]; then
    # Build the Docker image if it doesn't exist
    if ! docker images | grep -q "predictduel-anchor-builder"; then
        echo "📦 Building Docker image..."
        $DOCKER_COMPOSE build anchor-builder
    fi
    
    # Run the build inside the container
    echo "🏗️  Building program..."
    $DOCKER_COMPOSE run --rm anchor-builder anchor build
else
    # Fallback to docker build/run if docker-compose is not available or file doesn't exist
    echo "📦 Building Docker image (using docker directly)..."
    docker build -t predictduel-anchor-builder .
    
    echo "🏗️  Building program..."
    docker run --rm -v "$(pwd):/workspace" -w /workspace predictduel-anchor-builder anchor build
fi

echo "✅ Build complete! Artifacts are in target/"

