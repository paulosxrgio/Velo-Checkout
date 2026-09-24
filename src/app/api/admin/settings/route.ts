import { toOperationSettings } from "@/server/admin/dto";
import { canUseProduction, getSettingsRow, updateSettings } from "@/server/admin/repository";
import { settingsInput } from "@/server/admin/schemas";
import { adminRoute } from "@/server/auth/dal";
import { ApiError, ok, readJson } from "@/server/http/api";

export const GET = adminRoute(async ({ db }) => ok(toOperationSettings(await getSettingsRow(db))));

export const PUT = adminRoute(
  async ({ request, db, admin }) => {
    const input = await readJson(request, settingsInput);
    if (input.environment === "production" && !(await canUseProduction(db))) {
      throw new ApiError(422, "validation", "Produção exige Shopify e Whop conectadas e verificadas.", {
        environment: "Produção só fica disponível depois que Shopify e Whop estiverem conectadas.",
      });
    }
    return ok(await updateSettings(db, input, admin.userId));
  },
  { mutation: true },
);
