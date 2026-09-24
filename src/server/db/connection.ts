import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import * as schema from "./schema";

/**
 * Fábrica de conexões com o Postgres. Sem `server-only` de propósito:
 * é reutilizada pelos scripts de CLI e pelos testes. O código da aplicação
 * usa `getDb()` (src/server/db/client.ts).
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * TLS: respeita `sslmode` quando presente na URL; caso contrário, exige TLS
 * para hosts remotos (como o Supabase) e dispensa para o Postgres local.
 */
export function resolveSsl(databaseUrl: string): false | "require" | undefined {
  const url = new URL(databaseUrl);
  if (url.searchParams.has("sslmode")) return undefined;
  return LOCAL_HOSTS.has(url.hostname) ? false : "require";
}

export function createDatabase(databaseUrl: string, options: { max?: number } = {}) {
  const ssl = resolveSsl(databaseUrl);
  const client = postgres(databaseUrl, {
    // O pooler do Supabase em modo transação não suporta prepared statements.
    prepare: false,
    max: options.max ?? 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => undefined,
    ...(ssl === undefined ? {} : { ssl }),
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDatabase>["db"];

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** Aplica, em ordem, as migrações versionadas em `drizzle/`. Idempotente. */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const { db, client } = createDatabase(databaseUrl, { max: 1 });
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end({ timeout: 5 });
  }
}
