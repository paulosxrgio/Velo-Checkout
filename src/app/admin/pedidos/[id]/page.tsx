import type { Metadata } from "next";
import { OrderDetailPage } from "@/features/admin/order-detail-page";

export const metadata: Metadata = { title: "Detalhe do pedido" };

export default async function Page({ params }: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  return <OrderDetailPage key={id} orderId={decodeURIComponent(id)} />;
}
