/**
 * Aplica as migrações versionadas em `drizzle/` no banco configurado.
 *
 *   npm run db:migrate
 *
 * Usa MIGRATION_DATABASE_URL (conexão direta ou pooler em modo sessão) ou,
 * na falta dela, DATABASE_URL. Lê `.env.local`/`.env` como o Next.js.
 */
import { loadEnvConfig } from "@next/env";
import { ConfigError, getMigrationDatabaseUrl } from "../src/server/config";
import { runMigrations } from "../src/server/db/connection";

loadEnvConfig(process.cwd());

async function main() {
  const url = getMigrationDatabaseUrl();
  const host = new URL(url).host;
  console.log(`Aplicando migrações em ${host}…`);
  await runMigrations(url);
  console.log("Migrações aplicadas.");
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) console.error(`Configuração incompleta: ${error.message}`);
  else console.error("Falha ao aplicar migrações:", error instanceof Error ? error.message : error);
  process.exit(1);
});
