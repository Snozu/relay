import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Runs on a VPS behind a reverse proxy, as a self-contained server bundle.
  output: "standalone",
  serverExternalPackages: [
    // The local embedding model loads its own ONNX runtime and weights at
    // runtime; bundling it breaks the loader.
    "@huggingface/transformers",
  ],
};

export default nextConfig;
