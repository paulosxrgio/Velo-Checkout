import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigError, getEncryptionKey } from "@/server/config";
import { SecretBoxError, openSecret, sealSecret } from "@/server/security/secret-box";

const key = randomBytes(32);

describe("cofre de segredos (AES-256-GCM)", () => {
  afterEach(() => {
    delete process.env.VELO_ENCRYPTION_KEY;
  });

  it("cifra e decifra, sem expor o texto original no envelope", () => {
    const sealed = sealSecret("shpat_exemplo_nao_real", "shopify:access_token", key);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("shpat_exemplo_nao_real");
    expect(openSecret(sealed, "shopify:access_token", key)).toBe("shpat_exemplo_nao_real");
  });

  it("gera envelopes diferentes para o mesmo segredo (IV aleatório)", () => {
    expect(sealSecret("mesmo", "whop:api_key", key)).not.toBe(sealSecret("mesmo", "whop:api_key", key));
  });

  it("recusa segredo alterado, contexto trocado ou chave diferente", () => {
    const sealed = sealSecret("segredo", "whop:webhook_secret", key);
    const parts = sealed.split(".");
    const tampered = [...parts.slice(0, 4), Buffer.from("outro").toString("base64url")].join(".");
    expect(() => openSecret(tampered, "whop:webhook_secret", key)).toThrow(SecretBoxError);
    expect(() => openSecret(sealed, "whop:api_key", key)).toThrow(SecretBoxError);
    expect(() => openSecret(sealed, "whop:webhook_secret", randomBytes(32))).toThrow(/outra chave/);
  });

  it("exige VELO_ENCRYPTION_KEY válida, com mensagem clara", () => {
    expect(() => getEncryptionKey()).toThrow(ConfigError);
    process.env.VELO_ENCRYPTION_KEY = "curta";
    expect(() => getEncryptionKey()).toThrow(/32 bytes/);
    process.env.VELO_ENCRYPTION_KEY = key.toString("base64");
    expect(getEncryptionKey().equals(key)).toBe(true);
  });
});
