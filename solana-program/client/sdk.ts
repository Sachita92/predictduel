/**
 * PredictDuel Solana Program SDK
 * 
 * TypeScript client library for interacting with the PredictDuel smart contract
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
// Type import - may not exist until after anchor build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PredictDuel = any;

export enum MarketCategory {
  Crypto = "crypto",
  Weather = "weather",
  Sports = "sports",
  Meme = "meme",
  Local = "local",
  Other = "other",
}

export enum MarketType {
  Public = "public",
  Challenge = "challenge",
}

export enum MarketStatus {
  Pending = "pending",
  Active = "active",
  Resolved = "resolved",
  Cancelled = "cancelled",
}

export interface CreateMarketParams {
  marketIndex?: number; // Optional: market index for tracking
  question: string;
  category: MarketCategory;
  stakeAmount: number; // In lamports
  deadline: Date;
  marketType: MarketType;
}

export interface PlaceBetParams {
  marketPda: PublicKey;
  prediction: boolean; // true = YES, false = NO
  stakeAmount: number; // In lamports
}

export interface MarketData {
  creator: PublicKey;
  question: string;
  category: string;
  stakeAmount: number;
  deadline: number;
  marketType: string;
  status: string;
  poolSize: number;
  yesCount: number;
  noCount: number;
  totalParticipants: number;
  outcome: boolean | null;
  createdAt: number;
}

export class PredictDuelClient {
  private program: Program<Idl>;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    programId: PublicKey
  ) {
    this.provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    const idlRaw = require("../target/idl/predict_duel.json");
    const idl: any = JSON.parse(JSON.stringify(idlRaw));
    
    // Ensure metadata exists with address
    if (!idl.metadata) {
      idl.metadata = { address: programId.toString() };
    } else if (!idl.metadata.address) {
      idl.metadata.address = programId.toString();
    }
    
    // Create Program instance - try three-parameter version first, fallback to two-parameter
    try {
      // @ts-ignore - TypeScript doesn't recognize this overload but it works at runtime
      this.program = new Program(idl, programId, this.provider) as Program<Idl>;
    } catch (err) {
      // Fallback: use two-parameter version (Anchor extracts programId from metadata)
      this.program = new Program(idl, this.provider) as Program<Idl>;
    }
  }

  /**
   * Create a new prediction market
   */
  async createMarket(
    params: CreateMarketParams
  ): Promise<{ signature: string; marketPda: PublicKey }> {
    const { marketIndex = 1, question, category, stakeAmount, deadline, marketType } = params;

    // Derive market PDA
    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        this.provider.wallet.publicKey.toBuffer(),
        Buffer.from(question),
      ],
      this.program.programId
    );

    // Derive market vault PDA
    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      this.program.programId
    );

    const categoryEnum = { [category]: {} };
    const typeEnum = { [marketType]: {} };

    const tx = await this.program.methods
      .createMarket(
        new anchor.BN(marketIndex),
        question,
        categoryEnum,
        new anchor.BN(stakeAmount),
        new anchor.BN(Math.floor(deadline.getTime() / 1000)),
        typeEnum
      )
      .accounts({
        market: marketPda,
        creator: this.provider.wallet.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return { signature: tx, marketPda };
  }

  /**
   * Place a bet on a prediction market
   */
  async placeBet(
    params: PlaceBetParams
  ): Promise<{ signature: string; participantPda: PublicKey }> {
    const { marketPda, prediction, stakeAmount } = params;

    // Derive participant PDA
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    // Derive market vault PDA
    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .placeBet(prediction, new anchor.BN(stakeAmount))
      .accounts({
        market: marketPda,
        participant: participantPda,
        bettor: this.provider.wallet.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return { signature: tx, participantPda };
  }

  /**
   * Resolve a prediction market
   */
  async resolveMarket(
    marketPda: PublicKey,
    outcome: boolean
  ): Promise<string> {
    const tx = await this.program.methods
      .resolveMarket(outcome)
      .accounts({
        market: marketPda,
        resolver: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim winnings from a resolved market
   */
  async claimWinnings(marketPda: PublicKey): Promise<string> {
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .claimWinnings()
      .accounts({
        market: marketPda,
        participant: participantPda,
        winner: this.provider.wallet.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Cancel a market (only if no participants)
   */
  async cancelMarket(marketPda: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .cancelMarket()
      .accounts({
        market: marketPda,
        creator: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Refund stake from a cancelled market
   */
  async refundStake(marketPda: PublicKey): Promise<string> {
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_vault"), marketPda.toBuffer()],
      this.program.programId
    );

    const tx = await this.program.methods
      .refundStake()
      .accounts({
        market: marketPda,
        participant: participantPda,
        bettor: this.provider.wallet.publicKey,
        marketVault: marketVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Fetch market data
   */
  async getMarket(marketPda: PublicKey): Promise<MarketData> {
    // @ts-ignore - Account types are dynamically generated from IDL
    const market = await this.program.account.market.fetch(marketPda);
    
    return {
      creator: market.creator,
      question: market.question,
      category: Object.keys(market.category)[0],
      stakeAmount: market.stakeAmount.toNumber(),
      deadline: market.deadline.toNumber(),
      marketType: Object.keys(market.marketType)[0],
      status: Object.keys(market.status)[0],
      poolSize: market.poolSize.toNumber(),
      yesCount: market.yesCount,
      noCount: market.noCount,
      totalParticipants: market.totalParticipants,
      outcome: market.outcome,
      createdAt: market.createdAt.toNumber(),
    };
  }

  /**
   * Fetch participant data
   */
  async getParticipant(marketPda: PublicKey, bettorPubkey: PublicKey) {
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        bettorPubkey.toBuffer(),
      ],
      this.program.programId
    );

    // @ts-ignore - Account types are dynamically generated from IDL
    return await this.program.account.participant.fetch(participantPda);
  }

  /**
   * Get all markets created by a user
   */
  async getMarketsByCreator(creatorPubkey: PublicKey): Promise<MarketData[]> {
    // @ts-ignore - Account types are dynamically generated from IDL
    const markets = await this.program.account.market.all([
      {
        memcmp: {
          offset: 8, // Discriminator
          bytes: creatorPubkey.toBase58(),
        },
      },
    ]);

    return markets.map((m) => ({
      creator: m.account.creator,
      question: m.account.question,
      category: Object.keys(m.account.category)[0],
      stakeAmount: m.account.stakeAmount.toNumber(),
      deadline: m.account.deadline.toNumber(),
      marketType: Object.keys(m.account.marketType)[0],
      status: Object.keys(m.account.status)[0],
      poolSize: m.account.poolSize.toNumber(),
      yesCount: m.account.yesCount,
      noCount: m.account.noCount,
      totalParticipants: m.account.totalParticipants,
      outcome: m.account.outcome,
      createdAt: m.account.createdAt.toNumber(),
    }));
  }

  /**
   * Derive market PDA for a given question and creator
   */
  static deriveMarketPda(
    programId: PublicKey,
    creatorPubkey: PublicKey,
    question: string
  ): PublicKey {
    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creatorPubkey.toBuffer(),
        Buffer.from(question),
      ],
      programId
    );
    return marketPda;
  }

  /**
   * Derive participant PDA
   */
  static deriveParticipantPda(
    programId: PublicKey,
    marketPda: PublicKey,
    bettorPubkey: PublicKey
  ): PublicKey {
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        bettorPubkey.toBuffer(),
      ],
      programId
    );
    return participantPda;
  }

  /**
   * Helper: Convert SOL to lamports
   */
  static solToLamports(sol: number): number {
    return sol * anchor.web3.LAMPORTS_PER_SOL;
  }

  /**
   * Helper: Convert lamports to SOL
   */
  static lamportsToSol(lamports: number): number {
    return lamports / anchor.web3.LAMPORTS_PER_SOL;
  }
}

export default PredictDuelClient;

