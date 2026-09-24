import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { ConfigError } from "../config";

/**
 * Utilitários das rotas de API.
 *
 * Envelope de resposta:
 *   sucesso → { data }
 *   erro    → { error: { code, message, fieldErrors? } }
 *
 * Todas as respostas levam `Cache-Control: no-store`. Erros inesperados
 * viram 500 com mensagem genérica; o detalhe fica só no log do servidor.
 */

export type ApiErrorCode =
  | "unauthorized"
  | "invalid_credentials"
  | "forbidden"
  | "not_found"
  | "validation"
  | "rate_limited"
  | "payload_too_large"
  | "unsupported_media_type"
  | "misconfigured"
  | "server";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_JSON_BYTES = 1_000_000;

export function ok<T>(data: T, init: { status?: number } = {}) {
  return NextResponse.json({ data }, { status: init.status ?? 200, headers: NO_STORE });
}

const MISSING_SCHEMA_CODES = new Set(["42P01", "3F000"]);
const CONNECTION_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "28P01", "28000", "3D000", "CONNECT_TIMEOUT"]);

/** Traduz falhas comuns do banco em instruções claras de configuração. */
export function describeDatabaseProblem(error: unknown): string | null {
  const cause = (error as { cause?: unknown } | null)?.cause ?? error;
  const code = (cause as { code?: string } | null)?.code;
  if (!code) return null;
  if (MISSING_SCHEMA_CODES.has(code)) return "as tabelas do Velo não existem neste banco. Rode `npm run db:migrate`.";
  if (CONNECTION_CODES.has(code)) return "não foi possível conectar ao banco. Confira DATABASE_URL e a senha do Postgres.";
  return null;
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } },
      { status: error.status, headers: { ...NO_STORE, ...error.headers } },
    );
  }
  if (error instanceof ConfigError) {
    console.error(`[velo] Configuração incompleta: ${error.message}`);
    return NextResponse.json({ error: { code: "misconfigured", message: `Configuração incompleta do servidor: ${error.message}` } }, { status: 503, headers: NO_STORE });
  }
  const databaseProblem = describeDatabaseProblem(error);
  if (databaseProblem) {
    console.error(`[velo] Banco indisponível: ${databaseProblem}`);
    return NextResponse.json({ error: { code: "misconfigured", message: `Configuração incompleta do servidor: ${databaseProblem}` } }, { status: 503, headers: NO_STORE });
  }
  console.error("[velo] Erro inesperado na API:", error instanceof Error ? `${error.name}: ${error.message}` : error);
  return NextResponse.json(
    { error: { code: "server", message: "Erro inesperado no servidor. Tente novamente em instantes." } },
    { status: 500, headers: NO_STORE },
  );
}

/**
 * Proteção contra CSRF em requisições que alteram dados: exige o cabeçalho
 * Origin igual à origem do próprio servidor. Complementa o cookie SameSite=Lax.
 */
export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new ApiError(403, "forbidden", "Origem da requisição não permitida.");
  }
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}

/** Lê e valida um corpo JSON com limite de tamanho. */
export async function readJson<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Envie os dados como application/json.");
  }
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_BYTES) {
    throw new ApiError(413, "payload_too_large", "Os dados enviados são grandes demais.");
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, "validation", "JSON inválido.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, "validation", "Confira os campos destacados.", fieldErrorsFrom(parsed.error));
  }
  return parsed.data;
}

/** IP do cliente informado pelo proxy de borda (Vercel e similares). */
export function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  return ip ? ip.slice(0, 64) : null;
}
