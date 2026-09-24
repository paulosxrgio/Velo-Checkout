import postgres from "postgres";
import type { TestProject } from "vitest/node";
import { runMigrations } from "../../src/server/db/connection";

/**
 * Cria um banco novo para cada execução dos testes, aplica as migrações do
 * zero (prova de que são reproduzíveis) e o remove ao final.
 *
 * Requer TEST_DATABASE_URL apontando para um Postgres em que o usuário possa
 * criar bancos (ex.: postgresql://usuario:senha@127.0.0.1:5432/postgres).
 * Sem ela, os testes de integração são ignorados com aviso.
 */

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const adminUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!adminUrl) {
    console.warn("\n[velo] TEST_DATABASE_URL não definido: testes de integração com banco serão ignorados.\n");
    project.provide("databaseUrl", "");
    return;
  }

  const name = `velo_test_${Date.now()}_${process.pid}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  await admin.unsafe(`create database "${name}"`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await runMigrations(url.toString());
  project.provide("databaseUrl", url.toString());

  return async () => {
    await admin.unsafe(`drop database if exists "${name}" with (force)`);
    await admin.end({ timeout: 5 });
  };
}
