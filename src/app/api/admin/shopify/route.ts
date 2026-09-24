import { toShopifyConnection } from "@/server/admin/dto";
import { getShopifyRow } from "@/server/admin/repository";
import { adminRoute } from "@/server/auth/dal";
import { ok } from "@/server/http/api";

/** Somente leitura: a conexão só muda pelo fluxo OAuth (próxima etapa). */
export const GET = adminRoute(async ({ db }) => ok(toShopifyConnection(await getShopifyRow(db))));
