// app/trending/page.tsx
"use client";

import { useEffect, useState } from "react";
import { fetchAllMarkets } from "@/services/fetchMarket";
import { fetchNFTMetadata } from "@/services/fetchNFTMetadata";
import { useWallet } from "@solana/wallet-adapter-react";
import { placeBet } from "@/services/contract"; // your existing contract service
import { PublicKey } from "@solana/web3.js";

type TrendCard = {
  publicKey: string;
  nftMint: string;
  name: string;
  image: string;
  description: string;
  totalUpBets: number;
  totalDownBets: number;
  upBettors: number;
  downBettors: number;
  endTs: number;
  finalized: boolean;
  result: number;
};

export default function TrendingPage() {
  const wallet = useWallet();
  const [trends, setTrends] = useState<TrendCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
  try {
    const markets = await fetchAllMarkets();

    const enriched = await Promise.allSettled( // ← allSettled instead of all
      markets.map(async (market: { nftMint: string; }) => {
        const meta = await fetchNFTMetadata(market.nftMint);
        return { ...market, ...meta };
      })
    );

    // Filter out failed ones
    const successful = enriched
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    setTrends(successful);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const handleBet = async (market: TrendCard, side: 0 | 1) => {
    if (!wallet.connected) return alert("Connect wallet first");
    try {
      await placeBet(wallet, new PublicKey(market.nftMint), side);
      alert(side === 0 ? "🔥 Upvote placed!" : "📉 Downvote placed!");
      loadTrends(); // refresh
    } catch (err) {
      console.error(err);
      alert("Bet failed");
    }
  };

  if (loading) return <p className="text-white p-10">Loading trends...</p>;

  return (
    <section className="w-full min-h-screen bg-black text-white">
      <div className="container mx-auto px-5 py-20">
        <h1 className="text-4xl font-bold uppercase mb-12">🔥 Trending</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trends.map((trend) => (
            <TrendCard
              key={trend.publicKey}
              trend={trend}
              onBet={handleBet}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Card Component ───────────────────────────────────────────────────────────

function TrendCard({
  trend,
  onBet,
}: {
  trend: TrendCard;
  onBet: (market: TrendCard, side: 0 | 1) => void;
}) {
  const totalBets = trend.totalUpBets + trend.totalDownBets;
  const upPct = totalBets > 0 ? Math.round((trend.totalUpBets / totalBets) * 100) : 50;
  const timeLeft = trend.endTs - Math.floor(Date.now() / 1000);
  const isExpired = timeLeft <= 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      
      {/* Image */}
      <img src={trend.image} className="w-full h-48 object-cover" />

      {/* Info */}
      <div className="p-5">
        <h3 className="text-white font-bold text-lg mb-1">{trend.name}</h3>
        <p className="text-neutral-400 text-sm mb-4">{trend.description}</p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-neutral-700 rounded mb-2">
          <div
            className="h-2 bg-green-500 rounded"
            style={{ width: `${upPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-400 mb-4">
          <span>🔥 {upPct}% Up ({trend.upBettors} bettors)</span>
          <span>📉 {100 - upPct}% Down ({trend.downBettors} bettors)</span>
        </div>

        {/* Status */}
        {trend.finalized ? (
          <div className="text-center py-2 bg-neutral-800 rounded text-sm">
            {trend.result === 0 ? "✅ Went Viral!" : "❌ Didn't Trend"}
          </div>
        ) : isExpired ? (
          <div className="text-center py-2 bg-yellow-900 rounded text-sm text-yellow-400">
            ⏳ Awaiting finalization
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => onBet(trend, 0)}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded font-medium text-sm"
            >
              🔥 Up (0.1 SOL)
            </button>
            <button
              onClick={() => onBet(trend, 1)}
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded font-medium text-sm"
            >
              📉 Down (0.1 SOL)
            </button>
          </div>
        )}

        {/* Timer */}
        {!isExpired && !trend.finalized && (
          <p className="text-center text-xs text-neutral-500 mt-3">
            ⏱ {Math.floor(timeLeft / 60)}m {timeLeft % 60}s left
          </p>
        )}
      </div>
    </div>
  );
}