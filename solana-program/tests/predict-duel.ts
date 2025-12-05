import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

describe("predict-duel", () => {
  const provider = anchor.AnchorProvider.env();
  
  // Ensure provider is valid
  if (!provider) {
    throw new Error("Provider is undefined. Make sure ANCHOR_PROVIDER_URL and ANCHOR_WALLET are set.");
  }
  
  anchor.setProvider(provider);

  // Try to use workspace first (standard Anchor pattern for tests)
  // If workspace is not available, fall back to manual IDL loading
  let program: any;
  let programId: PublicKey;
  
  // Try workspace pattern first - this is the recommended way in Anchor tests
  // Workspace is populated by Anchor automatically when running 'anchor test'
  const workspace = anchor.workspace as any;
  
  if (workspace) {
    const workspaceKeys = Object.keys(workspace);
    console.log("Available workspace keys:", workspaceKeys);
    
    // Try different possible program name variations
    // Anchor typically uses the program name from Anchor.toml in PascalCase
    const programName = workspace.PredictDuel || 
                       workspace.predict_duel || 
                       workspace.PredictDuelProgram ||
                       workspace.Predict_duel ||
                       workspace[workspaceKeys[0]]; // Try first key if standard names don't work
    
    if (programName) {
      program = programName;
      programId = program.programId;
      console.log("✅ Using workspace program:", programId.toString());
    } else {
      throw new Error(`Workspace available but program not found. Available keys: ${workspaceKeys.join(", ")}`);
    }
  } else {
    // Fallback: manually load IDL and create Program
    console.log("⚠️  Workspace not available, falling back to manual IDL loading");
    // Fallback: manually load IDL and create Program
    const idlPath = path.join(__dirname, "../target/idl/predict_duel.json");
    
    if (!fs.existsSync(idlPath)) {
      throw new Error(
        `IDL file not found at ${idlPath}.\n` +
        `Please ensure:\n` +
        `1. Anchor CLI version matches Rust dependencies (0.32.1)\n` +
        `2. Run 'anchor build' successfully\n` +
        `3. Check 'anchor --version' matches Cargo.toml version\n` +
        `4. Try 'avm install 0.32.1 && avm use 0.32.1' if versions don't match`
      );
    }
    
    const idlRaw = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    
    // Try to get program ID from keypair file first, then IDL metadata, then default
    let programIdString: string;
    try {
      const keypairPath = path.join(__dirname, "../target/deploy/predict_duel-keypair.json");
      if (fs.existsSync(keypairPath)) {
        const keypair = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
        const keypairBytes = new Uint8Array(keypair);
        const keypairKeypair = anchor.web3.Keypair.fromSecretKey(keypairBytes);
        programIdString = keypairKeypair.publicKey.toString();
      } else {
        throw new Error("Keypair file not found");
      }
    } catch (keypairErr) {
      // Fallback to IDL metadata or default
      programIdString = idlRaw.metadata?.address || "hLhVAG2CKKaFkueawfYQEMBetyQoyYtnPGdJQaj54xr";
    }
    
    if (!programIdString || typeof programIdString !== 'string') {
      throw new Error(`Invalid program ID: ${programIdString}`);
    }
    
    // Create PublicKey first to ensure it's valid
    programId = new PublicKey(programIdString);
    
    // Parse IDL and ensure metadata structure is correct for Anchor 0.32.1
    const idl: any = JSON.parse(JSON.stringify(idlRaw));
    
    // Ensure metadata exists with address (Anchor 0.32.1 expects this)
    if (!idl.metadata) {
      idl.metadata = {};
    }
    // Set address as string (not PublicKey object)
    idl.metadata.address = programIdString;
    
    // Create Program instance - Anchor 0.32.1 supports both signatures
    // Use the two-parameter version which extracts programId from metadata
    program = new Program(idl, provider);
    // Verify programId matches
    if (program.programId.toString() !== programIdString) {
      programId = program.programId;
    }
  }

  // Test accounts
  const creator = anchor.web3.Keypair.generate();
  const bettor1 = anchor.web3.Keypair.generate();
  const bettor2 = anchor.web3.Keypair.generate();

  // Market parameters
  const marketIndex = new anchor.BN(1);
  const question = "Will Bitcoin hit $100,000 by end of 2024?";
  const stakeAmount = new anchor.BN(100_000_000); // 0.1 SOL

  let marketPda: anchor.web3.PublicKey;
  let marketVaultPda: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        creator.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        bettor1.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        bettor2.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  it("Creates a prediction market", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    // FIXED: Use market_index instead of question for PDA seeds
    [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creator.publicKey.toBuffer(),
        marketIndex.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [marketVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        creator.publicKey.toBuffer(),
        marketIndex.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .createMarket(
        marketIndex,
        question,
        { crypto: {} },
        stakeAmount,
        new anchor.BN(deadline),
        { public: {} }
      )
      .accounts({
        market: marketPda,
        creator: creator.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.question, question);
    assert.equal(market.creator.toString(), creator.publicKey.toString());
    assert.equal(market.poolSize.toNumber(), 0);
    assert.equal(market.yesCount, 0);
    assert.equal(market.noCount, 0);
  });

  it("Places a YES bet on the market", async () => {
    const [participantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        bettor1.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .placeBet(true, stakeAmount)
      .accounts({
        market: marketPda,
        participant: participantPda,
        bettor: bettor1.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bettor1])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.poolSize.toNumber(), stakeAmount.toNumber());
    assert.equal(market.yesCount, 1);
    assert.equal(market.noCount, 0);
    assert.equal(market.totalParticipants, 1);

    const participant = await program.account.participant.fetch(participantPda);
    assert.equal(participant.prediction, true);
    assert.equal(participant.stake.toNumber(), stakeAmount.toNumber());
    assert.equal(participant.claimed, false);
  });

  it("Places a NO bet on the market", async () => {
    const [participantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        bettor2.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .placeBet(false, stakeAmount)
      .accounts({
        market: marketPda,
        participant: participantPda,
        bettor: bettor2.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bettor2])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.poolSize.toNumber(), stakeAmount.toNumber() * 2);
    assert.equal(market.yesCount, 1);
    assert.equal(market.noCount, 1);
    assert.equal(market.totalParticipants, 2);
  });

  it("Fails to resolve market before deadline", async () => {
    try {
      await program.methods
        .resolveMarket(true)
        .accounts({
          market: marketPda,
          resolver: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      assert.fail("Should have failed to resolve before deadline");
    } catch (error) {
      assert.include(error.toString(), "MarketNotExpired");
    }
  });

  it("Resolves the market (outcome: YES)", async () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 1;
    const marketIndex2 = new anchor.BN(2);
    const question2 = "Test market with past deadline";

    // FIXED: Use market_index for PDAs
    const [testMarketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creator.publicKey.toBuffer(),
        marketIndex2.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [testVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        creator.publicKey.toBuffer(),
        marketIndex2.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .createMarket(
        marketIndex2,
        question2,
        { crypto: {} },
        stakeAmount,
        new anchor.BN(pastDeadline),
        { public: {} }
      )
      .accounts({
        market: testMarketPda,
        creator: creator.publicKey,
        marketVault: testVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const [testParticipant1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        testMarketPda.toBuffer(),
        bettor1.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .placeBet(true, stakeAmount)
      .accounts({
        market: testMarketPda,
        participant: testParticipant1Pda,
        bettor: bettor1.publicKey,
        marketVault: testVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bettor1])
      .rpc();

    await program.methods
      .resolveMarket(true)
      .accounts({
        market: testMarketPda,
        resolver: creator.publicKey,
      })
      .signers([creator])
      .rpc();

    const market = await program.account.market.fetch(testMarketPda);
    assert.equal(market.outcome, true);
  });

  it("Allows winner to claim winnings", async () => {
    const marketIndex2 = new anchor.BN(2);

    const [testMarketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creator.publicKey.toBuffer(),
        marketIndex2.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [testVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        creator.publicKey.toBuffer(),
        marketIndex2.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [testParticipant1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        testMarketPda.toBuffer(),
        bettor1.publicKey.toBuffer(),
      ],
      program.programId
    );

    const balanceBefore = await provider.connection.getBalance(
      bettor1.publicKey
    );

    await program.methods
      .claimWinnings()
      .accounts({
        market: testMarketPda,
        participant: testParticipant1Pda,
        winner: bettor1.publicKey,
        marketVault: testVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bettor1])
      .rpc();

    const balanceAfter = await provider.connection.getBalance(
      bettor1.publicKey
    );

    const participant = await program.account.participant.fetch(
      testParticipant1Pda
    );
    assert.equal(participant.claimed, true);
    assert.isTrue(balanceAfter > balanceBefore);
  });

  it("Cancels a market with no participants", async () => {
    const marketIndex3 = new anchor.BN(3);
    const question3 = "Market to be cancelled";
    const futureDeadline = Math.floor(Date.now() / 1000) + 86400;

    const [cancelMarketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creator.publicKey.toBuffer(),
        marketIndex3.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [cancelVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        creator.publicKey.toBuffer(),
        marketIndex3.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .createMarket(
        marketIndex3,
        question3,
        { sports: {} },
        stakeAmount,
        new anchor.BN(futureDeadline),
        { public: {} }
      )
      .accounts({
        market: cancelMarketPda,
        creator: creator.publicKey,
        marketVault: cancelVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .cancelMarket()
      .accounts({
        market: cancelMarketPda,
        creator: creator.publicKey,
      })
      .signers([creator])
      .rpc();

    const market = await program.account.market.fetch(cancelMarketPda);
    assert.equal(
      JSON.stringify(market.status),
      JSON.stringify({ cancelled: {} })
    );
  });
});