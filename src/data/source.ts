/**
 * Seleção explícita da fonte de dados do frontend.
 *
 * NEXT_PUBLIC_DATA_SOURCE é obrigatória:
 *   - "api":  painel autenticado com dados do servidor (banco). No checkout,
 *             os cenários `demo*` continuam disponíveis somente como
 *             demonstração; carrinhos reais vão para o servidor (leitura de
 *             carrinho ainda não implementada: falha com erro explícito).
 *   - "demo": apenas o checkout de demonstração, sem servidor. O painel fica
 *             indisponível nesse modo.
 *
 * Valor ausente ou inválido gera erro claro. Nunca há recaída silenciosa
 * para dados demonstrativos. Esta variável não é secreta: apenas seleciona
 * o modo; credenciais ficam em variáveis sem o prefixo NEXT_PUBLIC_.
 */

export type DataSource = "api" | "demo";

export class DataSourceConfigError extends Error {
  readonly code = "misconfigured";
  constructor(message: string) {
    super(message);
    this.name = "DataSourceConfigError";
  }
}

export function resolveDataSource(value: string | undefined = process.env.NEXT_PUBLIC_DATA_SOURCE): DataSource {
  const normalized = value?.trim();
  if (normalized === "api" || normalized === "demo") return normalized;
  throw new DataSourceConfigError(
    normalized
      ? `NEXT_PUBLIC_DATA_SOURCE="${normalized}" é inválido. Use "api" (painel com login e banco) ou "demo" (somente checkout de demonstração).`
      : 'NEXT_PUBLIC_DATA_SOURCE não está definido. Use "api" (painel com login e banco) ou "demo" (somente checkout de demonstração).',
  );
}

/** Versão sem exceção, para textos informativos que não dependem dos dados. */
export function peekDataSource(): DataSource | null {
  try {
    return resolveDataSource();
  } catch {
    return null;
  }
}

/** Tokens de carrinho reservados para os cenários de demonstração. */
export function isDemoCartToken(token: string | null | undefined): boolean {
  return token === "demo" || Boolean(token?.startsWith("demo-"));
}

/** Tentativas de pagamento criadas pelo adaptador demonstrativo. */
export function isDemoAttemptId(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith("tent_demo_"));
}
