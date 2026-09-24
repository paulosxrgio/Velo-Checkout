import { listOrders } from "@/server/admin/repository";
import { adminRoute } from "@/server/auth/dal";
import { ok } from "@/server/http/api";

export const GET = adminRoute(async ({ db }) => ok(await listOrders(db)));
