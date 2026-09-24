import "server-only";
import { getDatabaseUrl } from "../config";
import { createDatabase, type Database } from "./connection";

type Holder = { db: Database; url: string };

// Reaproveita a conexão entre recarregamentos do servidor de desenvolvimento.
const globalForDb = globalThis as unknown as { __veloDb?: Holder };

/**
 * Conexão da aplicação. Lança `ConfigError` com mensagem clara se
 * DATABASE_URL estiver ausente ou inválida — nunca usa dados demonstrativos.
 */
export function getDb(): Database {
  const url = getDatabaseUrl();
  const current = globalForDb.__veloDb;
  if (current && current.url === url) return current.db;
  const { db } = createDatabase(url);
  globalForDb.__veloDb = { db, url };
  return db;
}
