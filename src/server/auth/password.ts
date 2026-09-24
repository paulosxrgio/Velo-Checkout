import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Hash de senhas com scrypt (node:crypto), sem dependências nativas.
 * Parâmetros seguem a recomendação da OWASP (N=2^15, r=8, p=3) e ficam
 * gravados junto do hash para permitir endurecê-los no futuro.
 *
 * Formato: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 */

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 3 } as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

function scrypt(password: string, salt: Buffer, params: { N: number; r: number; p: number }): Promise<Buffer> {
  const options: ScryptOptions = { ...params, maxmem: 256 * params.N * params.r };
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Regras mínimas para senhas de administrador. Devolve a mensagem de erro ou `null`. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  if (new Set(password).size < 6) return "A senha é repetitiva demais. Use uma frase ou combinação mais variada.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const { N, r, p } = DEFAULT_PARAMS;
  const key = await scrypt(password, salt, DEFAULT_PARAMS);
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password, salt, { N, r, p });
  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | null = null;

/**
 * Executa uma verificação completa contra um hash descartável.
 * Usado quando o e-mail não existe, para o tempo de resposta não revelar isso.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(24).toString("base64"));
  await verifyPassword(password, await dummyHash);
}
