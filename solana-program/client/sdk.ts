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
    programId: PublicKey,
    idl?: any // Optional: pass IDL directly for browser compatibility
  ) {
    // Validate inputs
    if (!connection) {
      throw new Error('Connection is required');
    }
    if (!wallet) {
      throw new Error('Wallet is required');
    }
    if (!wallet.publicKey) {
      throw new Error('Wallet must have a publicKey');
    }
    if (!programId) {
      throw new Error('Program ID is required');
    }
    
    // Normalize programId - always create a new PublicKey instance to ensure module consistency
    // This handles cases where programId might be from a different module instance
    let normalizedProgramId: PublicKey;
    try {
      const programIdString = typeof programId === 'string' 
        ? programId 
        : (programId as any)?.toString?.() || String(programId);
      
      if (!programIdString || programIdString.trim().length === 0) {
        throw new Error('Program ID string is empty');
      }
      
      normalizedProgramId = new PublicKey(programIdString);
    } catch (error) {
      throw new Error(
        `Invalid program ID format: ${error instanceof Error ? error.message : String(error)}. ` +
        `Expected a PublicKey instance or valid Solana address string.`
      );
    }
    
    // Validate and normalize wallet publicKey - ensure it's a PublicKey instance
    // This handles cases where the publicKey might be from a different module instance
    let normalizedPublicKey: PublicKey;
    const inputPubkey = wallet.publicKey as any; // Use 'as any' to handle type checking issues
    
    if (inputPubkey instanceof PublicKey) {
      // Even if it's already a PublicKey, create a new instance to ensure module consistency
      normalizedPublicKey = new PublicKey(inputPubkey.toString());
    } else if (inputPubkey && typeof inputPubkey.toString === 'function') {
      // Try to convert to PublicKey if it's not already one
      try {
        normalizedPublicKey = new PublicKey(inputPubkey.toString());
      } catch (error) {
        throw new Error(
          `Wallet publicKey must be a PublicKey instance. Got: ${typeof inputPubkey}, value: ${inputPubkey}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      throw new Error(
        `Wallet publicKey is invalid. Expected PublicKey instance, got: ${typeof inputPubkey}, value: ${inputPubkey}`
      );
    }
    
    // Validate publicKey has the required methods
    if (!normalizedPublicKey.toBuffer || typeof normalizedPublicKey.toBuffer !== 'function') {
      throw new Error('Wallet publicKey is not properly initialized (missing toBuffer method)');
    }
    
    // Create a new wallet object with normalized publicKey to ensure consistency
    // We can't modify the read-only property, so we create a new wallet object
    // Note: payer is optional in browser environments
    const normalizedWallet = {
      publicKey: normalizedPublicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    } as anchor.Wallet;
    
    this.provider = new AnchorProvider(
      connection,
      normalizedWallet,
      AnchorProvider.defaultOptions()
    );
    
    // Validate provider was created successfully
    if (!this.provider || !this.provider.wallet) {
      throw new Error('Failed to create AnchorProvider');
    }
    
    // Validate provider wallet publicKey is still a PublicKey after provider creation
    if (!(this.provider.wallet.publicKey instanceof PublicKey)) {
      throw new Error('Provider wallet publicKey is not a PublicKey instance after provider creation');
    }
    
    // Load IDL - support both Node.js (require) and browser (fetch/import) environments
    let idlRaw: any;
    
    if (idl) {
      // IDL passed directly (browser-friendly)
      idlRaw = idl;
    } else {
      // Try to load from file system (Node.js environment)
      try {
        // @ts-ignore - require may not be available in browser
        idlRaw = require("../target/idl/predict_duel.json");
      } catch (e) {
        throw new Error(
          "IDL not found. In browser environments, pass the IDL as the 4th parameter to PredictDuelClient constructor, " +
          "or ensure the IDL file is accessible. Error: " + (e as Error).message
        );
      }
    }
    
    // Parse IDL - avoid unnecessary stringify/parse if already an object
    let idlParsed: any;
    if (typeof idlRaw === 'string') {
      try {
        idlParsed = JSON.parse(idlRaw);
      } catch (parseError) {
        throw new Error(
          `Failed to parse IDL as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } else if (idlRaw && typeof idlRaw === 'object') {
      // Already an object, use it directly (but ensure it's a clean copy)
      try {
        idlParsed = JSON.parse(JSON.stringify(idlRaw));
      } catch (stringifyError) {
        throw new Error(
          `Failed to serialize IDL: ${stringifyError instanceof Error ? stringifyError.message : String(stringifyError)}`
        );
      }
    } else {
      throw new Error(`IDL must be a string or object, got: ${typeof idlRaw}`);
    }
    
    // Validate IDL has required structure
    if (!idlParsed || typeof idlParsed !== 'object') {
      throw new Error('IDL must be a valid object');
    }
    
    if (!idlParsed.version && !idlParsed.name) {
      console.warn('IDL appears to be missing version or name field - this may cause issues');
    }
    
    // Ensure metadata exists with address (Anchor expects this)
    if (!idlParsed.metadata) {
      idlParsed.metadata = {};
    }
    // Set address as string (not PublicKey object) - this is what Anchor expects
    // Use normalized programId to ensure consistency
    const programIdString = normalizedProgramId.toString();
    idlParsed.metadata.address = programIdString;
    
    // Validate metadata.address is set correctly
    if (!idlParsed.metadata.address || typeof idlParsed.metadata.address !== 'string') {
      throw new Error(
        `Failed to set IDL metadata.address. Expected string, got: ${typeof idlParsed.metadata.address}. ` +
        `Program ID: ${programIdString}`
      );
    }
    
    // Ensure the address matches our expected programId
    if (idlParsed.metadata.address !== programIdString) {
      throw new Error(
        `IDL metadata.address (${idlParsed.metadata.address}) doesn't match expected program ID (${programIdString})`
      );
    }
    
    // Some IDL formats also have programId at root level - ensure it matches if present
    if (idlParsed.programId && idlParsed.programId !== programIdString) {
      console.warn(
        `IDL has programId at root level (${idlParsed.programId}) that doesn't match expected (${programIdString}). ` +
        `Anchor will use metadata.address instead.`
      );
    }
    
    // Validate that provider.wallet.publicKey is properly initialized
    if (!this.provider.wallet?.publicKey) {
      throw new Error('Provider wallet publicKey is not initialized');
    }
    
    // Validate provider wallet publicKey is a PublicKey instance
    const walletPubkey = this.provider.wallet.publicKey;
    if (!(walletPubkey instanceof PublicKey)) {
      throw new Error('Provider wallet publicKey must be a PublicKey instance');
    }
    
    // Validate provider connection is properly initialized
    if (!this.provider.connection) {
      throw new Error('Provider connection is not initialized');
    }
    
    // Validate provider connection is a Connection instance
    if (!(this.provider.connection instanceof Connection)) {
      throw new Error('Provider connection must be a Connection instance');
    }
    
    // Create Program instance using two-parameter version (matches test file approach)
    // Anchor extracts programId from metadata.address
    // Ensure the address is set as a string to avoid any serialization issues
    try {
      // Double-check that metadata.address is set correctly as a string
      if (!idlParsed.metadata.address || typeof idlParsed.metadata.address !== 'string') {
        idlParsed.metadata.address = programIdString;
      }
      
      // Validate that the address matches our expected programId
      if (idlParsed.metadata.address !== programIdString) {
        console.warn(
          `IDL metadata address (${idlParsed.metadata.address}) doesn't match expected program ID (${programIdString}). ` +
          `Updating IDL metadata to use expected program ID.`
        );
        idlParsed.metadata.address = programIdString;
      }
      
      this.program = new Program(idlParsed, this.provider) as Program<Idl>;
      
      // Verify the program ID matches what we expect
      const actualProgramId = this.program.programId.toString();
      if (actualProgramId !== programIdString) {
        console.warn(
          `Program ID mismatch: expected ${programIdString}, got ${actualProgramId}. ` +
          `Using program ID from IDL metadata (${actualProgramId}).`
        );
        // Update to use the actual program ID from the IDL
        // This can happen if the IDL was generated with a different program ID
      }
      
      // Verify that program.programId is a valid PublicKey instance
      if (!this.program.programId || !(this.program.programId instanceof PublicKey)) {
        throw new Error(
          `Program ID is not a valid PublicKey instance. ` +
          `Got: ${typeof this.program.programId}, value: ${this.program.programId}`
        );
      }
    } catch (err) {
      console.error('Error creating Program:', err);
      console.error('IDL metadata:', idlParsed.metadata);
      console.error('Program ID string:', programIdString);
      console.error('Normalized ProgramId type:', normalizedProgramId instanceof PublicKey);
      console.error('Normalized ProgramId value:', normalizedProgramId.toString());
      console.error('Original ProgramId type:', programId instanceof PublicKey);
      console.error('Provider wallet publicKey:', this.provider.wallet?.publicKey?.toString());
      console.error('Provider wallet type:', typeof this.provider.wallet);
      console.error('Wallet publicKey type:', walletPubkey instanceof PublicKey);
      throw new Error(
        `Failed to initialize PredictDuel program: ${err instanceof Error ? err.message : String(err)}. ` +
        `Make sure the program ID ${programIdString} matches the deployed program and the IDL is valid. ` +
        `Also ensure the wallet provider is properly connected.`
      );
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
    // IMPORTANT: Seeds must match Rust program exactly:
    // seeds = [b"market", creator.key().as_ref(), &market_index.to_le_bytes()]
    // Use anchor.BN for browser compatibility (same as test file)
    const marketIndexBN = new anchor.BN(marketIndex);
    // Convert to array first, then to Buffer for browser compatibility
    const marketIndexArray = marketIndexBN.toArray("le", 8);
    const marketIndexBuffer = Buffer.from(marketIndexArray);
    
    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        this.provider.wallet.publicKey.toBuffer(),
        marketIndexBuffer,
      ],
      this.program.programId
    );

    // Derive market vault PDA
    // IMPORTANT: Seeds must match Rust program exactly:
    // seeds = [b"market_vault", creator.key().as_ref(), &market_index.to_le_bytes()]
    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        this.provider.wallet.publicKey.toBuffer(),
        marketIndexBuffer,
      ],
      this.program.programId
    );

    const categoryEnum = { [category]: {} };
    const typeEnum = { [marketType]: {} };

    // Validate inputs before creating BN
    if (marketIndex === undefined || marketIndex === null || isNaN(marketIndex)) {
      throw new Error('marketIndex must be a valid number')
    }
    if (stakeAmount === undefined || stakeAmount === null || isNaN(stakeAmount)) {
      throw new Error('stakeAmount must be a valid number')
    }
    if (!deadline || !(deadline instanceof Date) || isNaN(deadline.getTime())) {
      throw new Error('deadline must be a valid Date object')
    }
    
    const deadlineTimestamp = Math.floor(deadline.getTime() / 1000)
    if (isNaN(deadlineTimestamp) || deadlineTimestamp <= 0) {
      throw new Error('deadline timestamp is invalid')
    }
    
    const tx = await this.program.methods
      .createMarket(
        new anchor.BN(Number(marketIndex)),
        question,
        categoryEnum,
        new anchor.BN(Number(stakeAmount)),
        new anchor.BN(deadlineTimestamp),
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

    // Fetch market account to get creator and market_index
    // Use type assertion to access account namespace
    const accountNamespace = this.program.account as any;
    const marketAccount = await accountNamespace.market.fetch(marketPda);
    const creator = new PublicKey(marketAccount.creator);
    const marketIndex = Number(marketAccount.marketIndex);

    // Derive participant PDA
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    // Derive market vault PDA using correct seeds: [market_vault, creator, market_index]
    // Use anchor.BN for browser compatibility (same approach as claimWinnings)
    const marketIndexBN = new anchor.BN(marketIndex);
    const marketIndexArray = marketIndexBN.toArray("le", 8);
    const marketIndexBuffer = Buffer.from(marketIndexArray);
    
    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        creator.toBuffer(),
        marketIndexBuffer,
      ],
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
    // First, fetch the market account to get creator and market_index
    // @ts-ignore - TypeScript doesn't know the account structure from IDL
    const marketAccount = await this.program.account.market.fetch(marketPda);
    const creator = marketAccount.creator as PublicKey;
    // @ts-ignore
    const marketIndex = marketAccount.marketIndex.toNumber();
    
    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        marketPda.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    // Derive market vault using creator and market_index (matches Rust program)
    // Use anchor.BN for browser compatibility
    const marketIndexBN = new anchor.BN(marketIndex);
    // Convert to array first, then to Buffer for browser compatibility
    const marketIndexArray = marketIndexBN.toArray("le", 8);
    const marketIndexBuffer = Buffer.from(marketIndexArray);
    
    const [marketVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market_vault"),
        creator.toBuffer(),
        marketIndexBuffer,
      ],
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
   * Derive market PDA for a given creator and market_index
   * IMPORTANT: Seeds must match Rust program: [b"market", creator.key().as_ref(), &market_index.to_le_bytes()]
   */
  static deriveMarketPda(
    programId: PublicKey,
    creatorPubkey: PublicKey,
    marketIndex: number
  ): PublicKey {
    // Use anchor.BN for browser compatibility
    const marketIndexBN = new anchor.BN(marketIndex);
    // Convert to array first, then to Buffer for browser compatibility
    const marketIndexArray = marketIndexBN.toArray("le", 8);
    const marketIndexBuffer = Buffer.from(marketIndexArray);
    
    const [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creatorPubkey.toBuffer(),
        marketIndexBuffer,
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

