"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { mintNFT } from "@/services/nft";
import { initializeMarket } from "@/services/contract";
import { PublicKey } from "@solana/web3.js";

export default function MintTrendPage() {
  const wallet = useWallet();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMint = async () => {
    if (!wallet.connected) {
      alert("Connect wallet first");
      return;
    }

    if (!file || !title) {
      alert("Fill all fields");
      return;
    }

    try {
      setLoading(true);

      // 🔥 Step 1: Mint NFT
      const nft = await mintNFT(wallet, file, title, desc);

      console.log("NFT minted:", nft.mint);

      // 🔥 Step 2: Create market
      await initializeMarket(wallet, new PublicKey(nft.mint), 300);

      alert("NFT + Market Created 🚀");
    } catch (err) {
      console.error(err);
      alert("Error minting NFT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full min-h-screen bg-black text-light-100">
      <div className="container mx-auto px-5 2xl:px-0 py-20">
        
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white font-bold text-3xl md:text-5xl uppercase mb-4">
            Mint Trend
          </h1>
          <p className="text-light-100 text-lg max-w-2xl">
            Create and mint your own trends on the blockchain.
          </p>
        </div>

        {/* Mint Form */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">

          {/* LEFT */}
          <div className="bg-neutral-900 rounded-lg p-8 border border-neutral-800">
            <h2 className="text-white font-bold text-xl uppercase mb-6">
              Mint Configuration
            </h2>

            <div className="space-y-4">

              {/* IMAGE UPLOAD */}
              <div>
                <label className="text-light-100 text-sm block mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-white"
                />
              </div>

              {/* TITLE */}
              <div>
                <label className="text-light-100 text-sm block mb-2">
                  Trend Name
                </label>
                <input
                  type="text"
                  placeholder="Enter trend name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="text-light-100 text-sm block mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe your trend"
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
                />
              </div>

              {/* BUTTON */}
              <button
                onClick={handleMint}
                disabled={loading}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded font-medium hover:opacity-80 transition-all mt-6"
              >
                {loading ? "Minting..." : "Mint & Create Market"}
              </button>

            </div>
          </div>

          {/* RIGHT PREVIEW */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 flex flex-col justify-center items-center">
            <div className="text-center">

              <h3 className="text-white font-semibold text-xl uppercase mb-4">
                Preview
              </h3>

              {file && (
                <img
                  src={URL.createObjectURL(file)}
                  className="w-40 h-40 object-cover rounded mb-4"
                />
              )}

              <p className="text-white font-bold">{title || "Your Title"}</p>
              <p className="text-white opacity-80 text-sm">
                {desc || "Your description"}
              </p>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}