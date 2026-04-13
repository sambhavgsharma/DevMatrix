export const fetchNFTMetadata = async (mintAddress: string) => {
  try {
    const { createUmi } = await import("@metaplex-foundation/umi-bundle-defaults");
    const { fetchDigitalAsset } = await import("@metaplex-foundation/mpl-token-metadata");
    const { publicKey } = await import("@metaplex-foundation/umi");

    const umi = createUmi("https://api.devnet.solana.com");
    const asset = await fetchDigitalAsset(umi, publicKey(mintAddress));

    if (!asset.metadata.uri) throw new Error("No URI");

    // ✅ Replace Pinata gateway with ipfs.io for metadata fetch
    const uri = asset.metadata.uri.replace(
      "https://gateway.pinata.cloud/ipfs/",
      "https://ipfs.io/ipfs/"
    );

    const res = await fetch(uri);
    const json = await res.json();

    console.log("NFT JSON metadata:", json); // ← check what image URL looks like

    // ✅ Replace Pinata gateway with ipfs.io for image too
    const image = json.image?.replace(
      "https://gateway.pinata.cloud/ipfs/",
      "https://ipfs.io/ipfs/"
    );

    return {
      name: json.name || "Unknown",
      description: json.description || "",
      image: image || null,
    };

  } catch (err) {
    console.warn("⚠️ Metadata fetch failed:", mintAddress, err);
    return { name: "Unknown NFT", description: "Metadata unavailable", image: null };
  }
};