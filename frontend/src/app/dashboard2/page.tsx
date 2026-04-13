'use client';

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { fetchAllMarkets, fetchMyBets, fetchPoolByKey } from "@/services/fetchMarket";
import { fetchNFTMetadata } from "@/services/fetchNFTMetadata";
import { finalizeMarket, claimReward } from "@/services/contract";

type MyNFT = {
  publicKey: string;
  nftMint: string;
  name: string;
  image: string | null;
  description: string;
  totalUpBets: number;
  totalDownBets: number;
  upBettors: number;
  downBettors: number;
  endTs: number;
  finalized: boolean;
  result: number;
  viralityScore: number;
};

type MyBet = {
  publicKey: string;
  poolKey: string;
  nftMint: string;
  amount: number;
  side: number;
  claimed: boolean;
  name: string;
  image: string | null;
  finalized: boolean;
  result: number;
  endTs: number;
  canClaim: boolean;
};

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const wallet = useWallet();

  const [myNFTs, setMyNFTs] = useState<MyNFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [finalizing, setFinalizing] = useState<string | null>(null);

  const [myBets, setMyBets] = useState<MyBet[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"trends" | "bets">("trends");

  useEffect(() => {
    if (connected && publicKey) {
      loadMyNFTs();
      loadMyBets();
    }
  }, [connected, publicKey]);

  const loadMyNFTs = async () => {
    try {
      setLoadingNFTs(true);
      const markets = await fetchAllMarkets();

      const mine = markets.filter(
        (m: { creator: string | undefined }) => m.creator === publicKey?.toString()
      );

      const enriched = await Promise.allSettled(
        mine.map(async (market: { nftMint: string }) => {
          const meta = await fetchNFTMetadata(market.nftMint);
          return { ...market, ...meta };
        })
      );

      const successful = enriched
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<any>).value);

      setMyNFTs(successful);
    } catch (err) {
      console.error("Failed to load my NFTs:", err);
    } finally {
      setLoadingNFTs(false);
    }
  };

  const loadMyBets = async () => {
    try {
      setLoadingBets(true);
      const bets = await fetchMyBets(publicKey!.toString());

      const enriched = await Promise.allSettled(
        bets.map(async (bet: any) => {
          const pool = await fetchPoolByKey(bet.poolKey);
          if (!pool) return null;

          const meta = await fetchNFTMetadata(pool.nftMint);
          const isWinner = pool.finalized && bet.side === pool.result;

          return {
            ...bet,
            nftMint: pool.nftMint,
            name: meta.name,
            image: meta.image,
            finalized: pool.finalized,
            result: pool.result,
            endTs: pool.endTs,
            canClaim: isWinner && !bet.claimed,
          };
        })
      );

      const successful = enriched
        .filter((r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value !== null)
        .map((r) => (r as PromiseFulfilledResult<any>).value);

      setMyBets(successful);
    } catch (err) {
      console.error("Failed to load bets:", err);
    } finally {
      setLoadingBets(false);
    }
  };

  const handleFinalize = async (nftMint: string) => {
    try {
      setFinalizing(nftMint);
      await finalizeMarket(wallet, nftMint, 70);
      alert("✅ Market finalized!");
      loadMyNFTs();
    } catch (err: any) {
      console.error(err);
      alert("Error finalizing: " + err.message);
    } finally {
      setFinalizing(null);
    }
  };

  const handleClaim = async (nftMint: string) => {
    try {
      setClaiming(nftMint);
      await claimReward(wallet, nftMint);
      alert("✅ Reward claimed!");
      loadMyBets();
    } catch (err: any) {
      console.error(err);
      alert("Claim failed: " + err.message);
    } finally {
      setClaiming(null);
    }
  };

  const now = Math.floor(Date.now() / 1000);

  // Stats
  const totalCreated = myNFTs.length;
  const totalWins = myNFTs.filter((n) => n.finalized && n.result === 0).length;
  const totalBetsReceived = myNFTs.reduce((acc, n) => acc + n.totalUpBets + n.totalDownBets, 0);
  const totalBetPlaced = myBets.reduce((acc, b) => acc + b.amount, 0);
  const totalClaimable = myBets.filter((b) => b.canClaim).length;

  return (
    <section className="w-full min-h-screen bg-black text-light-100">
      <div className="container mx-auto px-5 2xl:px-0 py-20">

        {!connected ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <h1 className="text-white font-bold text-4xl md:text-6xl uppercase mb-4 text-center">
              Connect Your Wallet
            </h1>
            <p className="text-light-100 text-lg max-w-2xl text-center mb-8">
              To access your dashboard and manage your portfolio, please connect your wallet.
            </p>
            <button
              onClick={() => setVisible(true)}
              className="px-8 py-3 bg-primary text-white rounded font-semibold uppercase hover:opacity-80 transition-all"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-16">
              <h1 className="text-white font-bold text-3xl md:text-5xl uppercase mb-4">
                Your Dashboard
              </h1>
              <p className="text-light-100 text-lg max-w-2xl">
                Welcome back! Manage your portfolio, trends, and bets.
              </p>
            </div>

            {/* Wallet Info + Portfolio */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <h2 className="text-white font-bold text-xl uppercase mb-4">Wallet Info</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-dark-100 text-xs uppercase">Address</p>
                    <p className="text-white font-semibold text-sm break-all">{publicKey?.toString()}</p>
                  </div>
                  <div>
                    <p className="text-dark-100 text-xs uppercase">Status</p>
                    <p className="text-green-400 font-semibold text-sm">Connected</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 flex flex-col justify-center">
                <h3 className="text-white font-semibold text-lg uppercase mb-2">Portfolio</h3>
                <p className="text-white text-3xl font-bold">
                  {(totalBetPlaced / 1e9).toFixed(2)} SOL
                </p>
                <p className="text-white/80 text-sm mt-2">
                  Total SOL you've bet across all trends
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mb-12">
              <h2 className="text-white font-bold text-xl uppercase mb-6">Your Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Trends Created", value: totalCreated },
                  { label: "Bets Received", value: (totalBetsReceived / 1e9).toFixed(2) + " SOL" },
                  { label: "Went Viral", value: totalWins },
                  { label: "Claimable Rewards", value: totalClaimable, highlight: totalClaimable > 0 },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-6 border text-center ${
                      stat.highlight
                        ? "bg-yellow-900 border-yellow-700"
                        : "bg-neutral-900 border-neutral-800"
                    }`}
                  >
                    <p className="text-dark-100 text-xs uppercase mb-2">{stat.label}</p>
                    <p className={`font-bold text-2xl ${stat.highlight ? "text-yellow-400" : "text-white"}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 mb-8">
              {[
                { key: "trends", label: `🎨 My Trends (${myNFTs.length})` },
                { key: "bets", label: `🎲 My Bets (${myBets.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-purple-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── MY TRENDS TAB ── */}
            {activeTab === "trends" && (
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl uppercase">My Trends</h2>
                  <button
                    onClick={loadMyNFTs}
                    className="text-xs text-neutral-400 hover:text-white border border-neutral-700 px-3 py-1 rounded"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {loadingNFTs ? (
                  <div className="text-center py-12">
                    <p className="text-neutral-400 text-sm">Loading your trends...</p>
                  </div>
                ) : myNFTs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-neutral-500 text-sm">No trends yet. Go mint your first trend!</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myNFTs.map((nft) => {
                      const isExpired = now >= nft.endTs;
                      const canFinalize = isExpired && !nft.finalized;
                      const timeLeft = nft.endTs - now;
                      const totalBets = nft.totalUpBets + nft.totalDownBets;
                      const upPct = totalBets > 0
                        ? Math.round((nft.totalUpBets / totalBets) * 100)
                        : 50;

                      return (
                        <div key={nft.publicKey} className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
                          {nft.image ? (
                            <img src={nft.image} className="w-full h-40 object-cover" />
                          ) : (
                            <div className="w-full h-40 bg-neutral-700 flex items-center justify-center">
                              <p className="text-neutral-500 text-xs">No image</p>
                            </div>
                          )}

                          <div className="p-4">
                            <h3 className="text-white font-bold text-base mb-1">{nft.name}</h3>
                            <p className="text-neutral-400 text-xs mb-3">{nft.description}</p>

                            <div className="w-full h-1.5 bg-neutral-600 rounded mb-1">
                              <div className="h-1.5 bg-green-500 rounded" style={{ width: `${upPct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 mb-3">
                              <span>🔥 {upPct}% ({nft.upBettors})</span>
                              <span>📉 {100 - upPct}% ({nft.downBettors})</span>
                            </div>

                            <p className="text-xs text-neutral-400 mb-3">
                              💰 Pool: {(totalBets / 1e9).toFixed(2)} SOL
                            </p>

                            {nft.finalized ? (
                              <div className={`text-center py-2 rounded text-sm font-medium ${
                                nft.result === 0 ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
                              }`}>
                                {nft.result === 0 ? "✅ Went Viral!" : "❌ Didn't Trend"}
                              </div>
                            ) : canFinalize ? (
                              <button
                                onClick={() => handleFinalize(nft.nftMint)}
                                disabled={finalizing === nft.nftMint}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-white text-sm font-medium"
                              >
                                {finalizing === nft.nftMint ? "Finalizing..." : "🏁 Finalize Market"}
                              </button>
                            ) : (
                              <div className="text-center py-2 bg-neutral-700 rounded text-xs text-neutral-400">
                                ⏱ {Math.floor(timeLeft / 60)}m {timeLeft % 60}s remaining
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── MY BETS TAB ── */}
            {activeTab === "bets" && (
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-bold text-xl uppercase">My Bets</h2>
                  <button
                    onClick={loadMyBets}
                    className="text-xs text-neutral-400 hover:text-white border border-neutral-700 px-3 py-1 rounded"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {loadingBets ? (
                  <div className="text-center py-12">
                    <p className="text-neutral-400 text-sm">Loading your bets...</p>
                  </div>
                ) : myBets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-neutral-500 text-sm">No bets yet. Go bet on some trends!</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myBets.map((bet) => (
                      <div key={bet.publicKey} className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
                        {bet.image ? (
                          <img src={bet.image} className="w-full h-36 object-cover" />
                        ) : (
                          <div className="w-full h-36 bg-neutral-700 flex items-center justify-center">
                            <p className="text-neutral-500 text-xs">No image</p>
                          </div>
                        )}

                        <div className="p-4">
                          <h3 className="text-white font-bold text-sm mb-1">{bet.name}</h3>

                          <div className="flex justify-between text-xs text-neutral-400 mb-3">
                            <span>Your bet: {bet.side === 0 ? "🔥 Up" : "📉 Down"}</span>
                            <span>{(bet.amount / 1e9).toFixed(2)} SOL</span>
                          </div>

                          {bet.claimed ? (
                            <div className="text-center py-2 bg-neutral-700 rounded text-xs text-neutral-400">
                              ✅ Reward Claimed
                            </div>
                          ) : bet.canClaim ? (
                            <button
                              onClick={() => handleClaim(bet.nftMint)}
                              disabled={claiming === bet.nftMint}
                              className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 rounded text-black text-sm font-bold"
                            >
                              {claiming === bet.nftMint ? "Claiming..." : "🏆 Claim Reward"}
                            </button>
                          ) : bet.finalized ? (
                            <div className="text-center py-2 bg-red-900 rounded text-xs text-red-400">
                              ❌ Lost — {bet.side === 0 ? "Didn't go viral" : "Went viral"}
                            </div>
                          ) : (
                            <div className="text-center py-2 bg-neutral-700 rounded text-xs text-neutral-400">
                              ⏳ Awaiting result
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </section>
  );
}