// services/fetchMarkets.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import idl from "@/idl/trendfi.json";
import type { Trendfi } from "@/idl/trendfi";

const PROGRAM_ID = new PublicKey("9PAegBz1mGWxqUpEtuegBbvVnNjT2UQjeCNxgSexTQpJ");
const connection = new Connection("https://api.devnet.solana.com");

export const fetchAllMarkets = async () => {
  try {
    const provider = new AnchorProvider(connection, {} as any, {});
    const program = new Program(idl as Trendfi, provider);

    console.log("✅ Program ID:", program.programId.toString());

    const pools = await (program.account as any).pool.all();

    console.log("✅ Pools found:", pools.length);
    console.log("✅ Raw pools:", pools);

    return pools.map((p: any) => ({
      publicKey: p.publicKey.toString(),
      nftMint: p.account.nftMint.toString(),
      creator: p.account.creator.toString(),
      totalUpBets: p.account.totalUpBets.toNumber(),
      totalDownBets: p.account.totalDownBets.toNumber(),
      upBettors: p.account.upBettors.toNumber(),
      downBettors: p.account.downBettors.toNumber(),
      endTs: p.account.endTs.toNumber(),
      finalized: p.account.finalized,
      result: p.account.result,
      viralityScore: p.account.viralityScore.toNumber(),
      rewardPoolLamports: p.account.rewardPoolLamports.toNumber(),
    }));

  } catch (err) {
    console.error("❌ fetchAllMarkets error:", err);
    return []; // return empty array so page doesn't crash
  }
};


export const fetchMyBets = async (walletPublicKey: string) => {
  try {
    const provider = {
      connection,
      publicKey: new PublicKey(walletPublicKey),
    };
    const program = new Program(idl as any, provider as any);

    // Fetch all UserBet accounts where user = connected wallet
    const bets = await (program.account as any).userBet.all([
      {
        memcmp: {
          offset: 8, // discriminator
          bytes: walletPublicKey,
        },
      },
    ]);

    console.log("My bets found:", bets.length);

    return bets.map((b: any) => ({
      publicKey: b.publicKey.toString(),
      poolKey: b.account.pool.toString(),
      nftMint: b.account.pool.toString(), // we'll resolve via pool
      amount: b.account.amount.toNumber(),
      side: b.account.side,
      claimed: b.account.claimed,
    }));
  } catch (err) {
    console.error("fetchMyBets error:", err);
    return [];
  }
};

// Also add this to fetch a single pool by its public key
export const fetchPoolByKey = async (poolKey: string) => {
  try {
    const provider = { connection, publicKey: PublicKey.default };
    const program = new Program(idl as any, provider as any);
    const pool = await (program.account as any).pool.fetch(new PublicKey(poolKey));
    return {
      nftMint: pool.nftMint.toString(),
      finalized: pool.finalized,
      result: pool.result,
      endTs: pool.endTs.toNumber(),
      rewardPoolLamports: pool.rewardPoolLamports.toNumber(),
      totalUpBets: pool.totalUpBets.toNumber(),
      totalDownBets: pool.totalDownBets.toNumber(),
    };
  } catch (err) {
    console.error("fetchPoolByKey error:", err);
    return null;
  }
};