import type { Metadata } from "next";
import { WhopPage } from "@/features/admin/whop-page";

export const metadata: Metadata = { title: "Whop" };

export default function Page() {
  return <WhopPage />;
}
