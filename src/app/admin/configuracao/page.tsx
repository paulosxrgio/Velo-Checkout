import type { Metadata } from "next";
import { SetupPage } from "@/features/admin/setup-page";

export const metadata: Metadata = { title: "Configuração guiada" };

export default function Page() {
  return <SetupPage />;
}
