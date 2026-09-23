import type { Metadata } from "next";
import { AppearancePage } from "@/features/admin/appearance-page";

export const metadata: Metadata = { title: "Aparência" };

export default function Page() {
  return <AppearancePage />;
}
