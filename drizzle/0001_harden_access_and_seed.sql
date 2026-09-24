-- Endurecimento de acesso e linhas iniciais da operação de loja única.
--
-- 1. O schema "velo" é privado: somente o dono (o papel usado pelo servidor)
--    acessa. No Supabase, os papéis "anon" e "authenticated" recebem a chave
--    pública do projeto; eles nunca podem ler ou escrever estas tabelas.
--    Os blocos verificam se os papéis existem, para a migração rodar também
--    em Postgres comum (desenvolvimento e testes).
-- 2. RLS já está ligado em todas as tabelas (migração 0000) e não há
--    políticas: qualquer papel que não seja o dono é negado por padrão.
-- 3. As linhas "singleton" da configuração são criadas aqui, de forma
--    idempotente, para que o painel sempre encontre um estado inicial.

REVOKE ALL ON SCHEMA "velo" FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "velo" FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "velo" FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA "velo" FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA "velo" FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA "velo" FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "velo" FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "velo" REVOKE ALL ON TABLES FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "velo" REVOKE ALL ON SEQUENCES FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "velo" REVOKE ALL ON FUNCTIONS FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint
INSERT INTO "velo"."operation_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "velo"."checkout_domain" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "velo"."shopify_connection" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "velo"."whop_connections" ("environment")
VALUES ('sandbox'), ('production')
ON CONFLICT ("environment") DO NOTHING;
