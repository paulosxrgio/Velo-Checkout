import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Imagens de produto virão do CDN da Shopify quando o carrinho real for integrado.
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
};

export default nextConfig;
