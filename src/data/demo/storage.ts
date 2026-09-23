/**
 * Persistência local usada somente pelo adaptador demonstrativo.
 * Tudo fica no navegador atual; nada é enviado a servidores.
 */

const PREFIX = "velo-demo:";

type StorageKind = "local" | "session";

function getStorage(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readDemo<T>(key: string, fallback: T, kind: StorageKind = "local"): T {
  const storage = getStorage(kind);
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeDemo<T>(key: string, value: T, kind: StorageKind = "local"): void {
  const storage = getStorage(kind);
  if (!storage) return;
  try {
    storage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Cota excedida ou armazenamento bloqueado: a demonstração segue sem persistir.
  }
}

/** Simula a latência de rede para que os estados de carregamento fiquem visíveis. */
export function simulateLatency(min = 350, max = 800): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function demoId(prefix: string): string {
  return `${prefix}_demo_${Math.random().toString(36).slice(2, 10)}`;
}
