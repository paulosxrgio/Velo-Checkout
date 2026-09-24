import { toAppearance } from "@/server/admin/dto";
import { getSettingsRow, updateAppearance } from "@/server/admin/repository";
import { appearanceInput } from "@/server/admin/schemas";
import { adminRoute } from "@/server/auth/dal";
import { ok, readJson } from "@/server/http/api";

export const GET = adminRoute(async ({ db }) => ok(toAppearance(await getSettingsRow(db))));

export const PUT = adminRoute(
  async ({ request, db, admin }) => {
    const input = await readJson(request, appearanceInput);
    return ok(await updateAppearance(db, input, admin.userId));
  },
  { mutation: true },
);
