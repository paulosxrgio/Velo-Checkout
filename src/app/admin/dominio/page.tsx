import type { Metadata } from "next";
import { DomainPage } from "@/features/admin/domain-page";

export const metadata: Metadata = { title: "Domínio" };

export default function Page() {
  return <DomainPage />;
}
