import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminPageSkeleton } from "@/components/admin/admin-states";
import { OrdersPage } from "@/features/admin/orders-page";

export const metadata: Metadata = { title: "Pedidos" };

export default function Page() {
  return (
    <Suspense fallback={<AdminPageSkeleton cards={1} />}>
      <OrdersPage />
    </Suspense>
  );
}
