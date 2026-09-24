/**
 * Cria (ou redefine a senha de) um administrador do painel.
 *
 *   npm run admin:create -- --email voce@empresa.com [--name "Seu nome"]
 *   npm run admin:create -- --email voce@empresa.com --reset-password
 *
 * A senha é pedida no terminal sem eco. Para automação, pode vir de
 * ADMIN_PASSWORD ou da entrada padrão (pipe). Ela nunca é impressa nem gravada
 * em texto: apenas o hash scrypt vai para o banco.
 */
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { normalizeEmail } from "../src/server/auth/login";
import { hashPassword, validatePasswordStrength } from "../src/server/auth/password";
import { revokeAllSessions } from "../src/server/auth/session";
import { ConfigError, getDatabaseUrl } from "../src/server/config";
import { createDatabase } from "../src/server/db/connection";
import { adminUsers } from "../src/server/db/schema";
import { isValidEmail } from "../src/domain/validation";

loadEnvConfig(process.cwd());

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (text: string) => void };
    let asked = false;
    output._writeToOutput = (text: string) => {
      if (!asked) {
        stdout.write(text);
        asked = true;
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readPiped(): Promise<string> {
  let data = "";
  for await (const chunk of stdin) data += chunk;
  return data.split(/\r?\n/)[0] ?? "";
}

async function obtainPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!stdin.isTTY) return readPiped();
  const first = await promptHidden("Senha (mínimo de 12 caracteres): ");
  const second = await promptHidden("Repita a senha: ");
  if (first !== second) throw new Error("As senhas não conferem.");
  return first;
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      "reset-password": { type: "boolean", default: false },
    },
  });

  const email = normalizeEmail(values.email ?? "");
  if (!isValidEmail(email)) throw new Error("Informe um e-mail válido com --email.");

  const { db, client } = createDatabase(getDatabaseUrl(), { max: 1 });
  try {
    const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (existing && !values["reset-password"]) {
      throw new Error(`Já existe um administrador com ${email}. Use --reset-password para trocar a senha.`);
    }
    if (!existing && values["reset-password"]) {
      throw new Error(`Não existe administrador com ${email}. Remova --reset-password para criá-lo.`);
    }

    const password = await obtainPassword();
    const weakness = validatePasswordStrength(password);
    if (weakness) throw new Error(weakness);
    const passwordHash = await hashPassword(password);

    if (existing) {
      await db.update(adminUsers).set({ passwordHash, isActive: true, updatedAt: new Date() }).where(eq(adminUsers.id, existing.id));
      await revokeAllSessions(db, existing.id);
      console.log(`Senha de ${email} redefinida. Sessões anteriores foram encerradas.`);
    } else {
      await db.insert(adminUsers).values({ email, passwordHash, displayName: values.name?.trim() || null });
      console.log(`Administrador ${email} criado.`);
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof ConfigError ? `Configuração incompleta: ${error.message}` : error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
