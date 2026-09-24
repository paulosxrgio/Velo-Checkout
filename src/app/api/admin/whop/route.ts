import { toWhopConnection } from "@/server/admin/dto";
import { getSettingsRow, getWhopRow } from "@/server/admin/repository";
import { adminRoute } from "@/server/auth/dal";
import { ok } from "@/server/http/api";

/** Somente leitura: devolve a conexão do ambiente selecionado nas configurações. */
export const GET = adminRoute(async ({ db }) => {
  const settings = await getSettingsRow(db);
  return ok(toWhopConnection(await getWhopRow(db, settings.paymentEnvironment)));
});
