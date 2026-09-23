import type { Metadata } from "next";
import { ShopifyPage } from "@/features/admin/shopify-page";

export const metadata: Metadata = { title: "Shopify" };

export default function Page() {
  return <ShopifyPage />;
}
