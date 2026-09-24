import { defineConfig } from "drizzle-kit";

/**
 * Configuração do drizzle-kit, usada só para gerar e conferir migrações
 * (`npm run db:generate` / `npm run db:check`). A aplicação das migrações
 * é feita por `npm run db:migrate` (scripts/db-migrate.ts).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["velo"],
  strict: true,
  verbose: true,
});
