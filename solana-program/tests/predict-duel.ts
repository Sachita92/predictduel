import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

describe("predict-duel", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program explicitly from IDL file
  const programId = new PublicKey("hLhVAG2CKKaFkueawfYQEMBetyQoyYtnPGdJQaj54xr");
  const idlPath = path.join(__dirname, "../target/idl/predict_duel.json");
  const idlJson = fs.readFileSync(idlPath, "utf8");
  const idl = JSON.parse(idlJson) as any; // Use 'any' to bypass metadata type checking
  
  // Ensure metadata has address
  if (!idl.metadata) {
    idl.metadata = { address: programId.toString() };
  } else {
    idl.metadata.address = programId.toString();
  }
  
  // @ts-ignore - bypass type checking for Program constructor
  const program: any = new Program(idl as Idl, programId, provider);

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