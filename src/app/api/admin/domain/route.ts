import { toDomainSettings } from "@/server/admin/dto";
import { getDomainRow, updateHostname } from "@/server/admin/repository";
import { domainInput } from "@/server/admin/schemas";
import { adminRoute } from "@/server/auth/dal";
import { ok, readJson } from "@/server/http/api";

export const GET = adminRoute(async ({ db }) => ok(toDomainSettings(await getDomainRow(db))));

export const PUT = adminRoute(
  async ({ request, db, admin }) => {
    const input = await readJson(request, domainInput);
    return ok(await updateHostname(db, input.hostname, admin.userId));
  },
  { mutation: true },
);
