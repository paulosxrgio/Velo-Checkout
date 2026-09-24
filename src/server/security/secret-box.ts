import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getEncryptionKey } from "../config";

/**
 * Cofre para segredos de integrações (tokens da Shopify, chaves e segredos de
 * webhook da Whop) gravados no banco.
 *
 * - AES-256-GCM com IV aleatório de 12 bytes e tag de autenticação.
 * - O `context` entra como dado autenticado (AAD): um segredo cifrado para
 *   "shopify:access_token" não pode ser copiado para outra coluna e aberto lá.
 * - O envelope carrega o identificador da chave, para detectar chave trocada
 *   e permitir rotação futura.
 *
 * Formato: v1.<keyId>.<iv>.<tag>.<ciphertext> (base64url)
 *
 * A chave vem de VELO_ENCRYPTION_KEY, somente no servidor. Nada aqui é
 * exposto por API: os DTOs do painel nunca incluem colunas cifradas.
 */

const VERSION = "v1";
const IV_BYTES = 12;

export type SecretContext =
  | "shopify:access_token"
  | "shopify:oauth_state"
  | "whop:api_key"
  | "whop:webhook_secret";

export class SecretBoxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretBoxError";
  }
}

export function encryptionKeyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

export function sealSecret(plaintext: string, context: SecretContext, key: Buffer = getEncryptionKey()): string {
  if (!plaintext) throw new SecretBoxError("Não é possível cifrar um segredo vazio.");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, encryptionKeyId(key), iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function openSecret(sealed: string, context: SecretContext, key: Buffer = getEncryptionKey()): string {
  const parts = sealed.split(".");
  if (parts.length !== 5 || parts[0] !== VERSION) throw new SecretBoxError("Formato de segredo cifrado desconhecido.");
  const [, keyId, iv, tag, ciphertext] = parts;
  if (keyId !== encryptionKeyId(key)) {
    throw new SecretBoxError("O segredo foi cifrado com outra chave. Confira VELO_ENCRYPTION_KEY.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new SecretBoxError("Não foi possível abrir o segredo: dados alterados ou contexto incorreto.");
  }
}
