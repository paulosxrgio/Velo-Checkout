import { describe, expect, it } from "vitest";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";

describe("hash de senha (scrypt)", () => {
  it("verifica a senha correta e recusa a errada", async () => {
    const hash = await hashPassword("frase-longa-de-teste-123");
    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$[^$]+\$[^$]+$/);
    await expect(verifyPassword("frase-longa-de-teste-123", hash)).resolves.toBe(true);
    await expect(verifyPassword("frase-longa-de-teste-124", hash)).resolves.toBe(false);
  });

  it("usa sal aleatório: a mesma senha gera hashes diferentes", async () => {
    const [a, b] = await Promise.all([hashPassword("mesma-senha-segura!"), hashPassword("mesma-senha-segura!")]);
    expect(a).not.toBe(b);
  });

  it("recusa hashes malformados sem lançar exceção", async () => {
    await expect(verifyPassword("qualquer", "texto-puro")).resolves.toBe(false);
    await expect(verifyPassword("qualquer", "scrypt$x$8$3$abc$def")).resolves.toBe(false);
  });

  it("exige senhas longas e variadas", () => {
    expect(validatePasswordStrength("curta")).toMatch(/12 caracteres/);
    expect(validatePasswordStrength("aaaaaaaaaaaaaaaa")).toMatch(/repetitiva/);
    expect(validatePasswordStrength("cavalo correto bateria grampo")).toBeNull();
  });
});
