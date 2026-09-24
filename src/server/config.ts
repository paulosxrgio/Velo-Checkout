/**
 * Leitura e validação das variáveis de ambiente do servidor.
 *
 * Nenhuma destas variáveis tem prefixo NEXT_PUBLIC_: elas nunca chegam ao
 * navegador. Configuração ausente ou inválida gera `ConfigError` com uma
 * mensagem que diz exatamente o que corrigir — nunca um valor padrão silencioso.
 */

export class ConfigError extends Error {
  readonly code = "misconfigured";
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function assertPostgresUrl(name: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`${name} não é uma URL válida. Use o formato postgresql://usuario:senha@host:porta/banco.`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new ConfigError(`${name} deve começar com postgresql://.`);
  }
  return value;
}

/** String de conexão usada pela aplicação (no Supabase, o pooler em modo transação). */
export function getDatabaseUrl(): string {
  const value = readEnv("DATABASE_URL");
  if (!value) {
    throw new ConfigError(
      "DATABASE_URL não está definido. Configure no servidor a string de conexão do Postgres do Supabase (Project → Connect).",
    );
  }
  return assertPostgresUrl("DATABASE_URL", value);
}

/** Conexão usada pelas migrações: MIGRATION_DATABASE_URL (conexão direta ou em modo sessão) ou, na falta dela, DATABASE_URL. */
export function getMigrationDatabaseUrl(): string {
  const value = readEnv("MIGRATION_DATABASE_URL");
  return value ? assertPostgresUrl("MIGRATION_DATABASE_URL", value) : getDatabaseUrl();
}

/**
 * Chave de cifragem dos segredos de integrações (tokens da Shopify, chaves da Whop).
 * Obrigatória somente quando um segredo for gravado ou lido.
 */
export function getEncryptionKey(): Buffer {
  const value = readEnv("VELO_ENCRYPTION_KEY");
  if (!value) {
    throw new ConfigError(
      "VELO_ENCRYPTION_KEY não está definida. Gere uma chave com `openssl rand -base64 32` e configure-a somente no servidor.",
    );
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== value.replace(/=+$/, "")) {
    throw new ConfigError("VELO_ENCRYPTION_KEY deve ter exatamente 32 bytes codificados em base64.");
  }
  return key;
}

export const isProduction = process.env.NODE_ENV === "production";
