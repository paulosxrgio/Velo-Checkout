import type { Metadata } from "next";
import { AdminFrame } from "@/features/admin/admin-frame";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Velo" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminFrame>{children}</AdminFrame>;
}
