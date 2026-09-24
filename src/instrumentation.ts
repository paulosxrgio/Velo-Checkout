/**
 * Verificação da configuração na inicialização do servidor.
 * Problemas aparecem no log logo ao subir, com a mesma mensagem que as
 * rotas devolvem (503) — nunca como recaída silenciosa para dados demo.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { resolveDataSource } = await import("./data/source");
  const { getDatabaseUrl } = await import("./server/config");

  try {
    const source = resolveDataSource();
    if (source === "api") getDatabaseUrl();
  } catch (error) {
    console.error(`[velo] Configuração incompleta: ${error instanceof Error ? error.message : String(error)}`);
  }
}
