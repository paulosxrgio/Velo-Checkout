import type { Metadata } from "next";
import { OverviewPage } from "@/features/admin/overview-page";

export const metadata: Metadata = { title: "Visão geral" };

export default function Page() {
  return <OverviewPage />;
}
