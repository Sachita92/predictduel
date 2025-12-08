# Dockerfile for building Anchor 0.32.1 Solana program
# Uses Rust 1.70+ which is compatible with Anchor 0.32.1

FROM rust:1.75-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# Install Anchor via AVM (Anchor Version Manager)
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Anchor 0.32.1
RUN avm install 0.32.1
RUN avm use 0.32.1

# Set working directory
WORKDIR /workspace

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock* ./
COPY Anchor.toml ./
COPY package.json package-lock.json* ./

# Copy program source
COPY programs ./programs

# Build the program
RUN anchor build

# Final stage - just keep the built artifacts
FROM rust:1.75-slim

# Install Solana CLI for deployment
RUN sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# Install Anchor
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
ENV PATH="/root/.cargo/bin:${PATH}"
RUN avm install 0.32.1
RUN avm use 0.32.1

WORKDIR /workspace

# Copy built artifacts from builder
COPY --from=builder /workspace/target ./target
COPY --from=builder /workspace/Anchor.toml ./
COPY --from=builder /workspace/Cargo.toml ./
COPY --from=builder /workspace/programs ./programs

CMD ["/bin/bash"]
