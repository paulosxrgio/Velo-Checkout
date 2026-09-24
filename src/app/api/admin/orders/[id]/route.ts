import { z } from "zod";
import { getOrder } from "@/server/admin/repository";
import { adminRoute } from "@/server/auth/dal";
import { ApiError, ok } from "@/server/http/api";

export const GET = adminRoute<RouteContext<"/api/admin/orders/[id]">>(async ({ db, context }) => {
  const { id } = await context.params;
  const parsed = z.uuid().safeParse(id);
  const order = parsed.success ? await getOrder(db, parsed.data) : null;
  if (!order) throw new ApiError(404, "not_found", "Pedido não encontrado.");
  return ok(order);
});
