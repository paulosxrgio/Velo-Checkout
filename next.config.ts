import type { NextConfig } from "next";

/** Painel e login não podem ser embutidos em outros sites (clickjacking) nem vazar URLs internas. */
const adminSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  images: {
    // Imagens de produto virão do CDN da Shopify quando o carrinho real for integrado.
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
  async headers() {
    return [
      { source: "/admin/:path*", headers: adminSecurityHeaders },
      { source: "/admin", headers: adminSecurityHeaders },
      { source: "/entrar", headers: adminSecurityHeaders },
    ];
  },
};

export default nextConfig;
