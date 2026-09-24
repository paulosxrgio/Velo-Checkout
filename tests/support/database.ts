import { sql } from "drizzle-orm";
import { inject } from "vitest";
import { createDatabase, type Database } from "../../src/server/db/connection";

/** URL do banco criado pelo setup global ("" quando TEST_DATABASE_URL não foi definido). */
export const testDatabaseUrl = inject("databaseUrl");
export const hasTestDatabase = Boolean(testDatabaseUrl);

export function connectTestDatabase() {
  return createDatabase(testDatabaseUrl, { max: 2 });
}

/** Volta o banco ao estado pós-migração: sem usuários, sessões ou registros de checkout. */
export async function resetDatabase(db: Database) {
  // Sem CASCADE: as linhas singleton referenciam admin_users (updated_by) e não podem ser apagadas.
  await db.execute(sql`truncate velo.webhook_events, velo.payment_attempts, velo.quotes, velo.carts restart identity`);
  await db.execute(sql`truncate velo.admin_login_attempts restart identity`);
  await db.execute(sql`update velo.operation_settings set updated_by = null`);
  await db.execute(sql`update velo.checkout_domain set updated_by = null`);
  await db.execute(sql`delete from velo.admin_users`);
  await db.execute(sql`
    update velo.operation_settings set
      operation_name = '', alert_email = null, store_url = null, currency_code = 'BRL',
      timezone = 'America/Sao_Paulo', payment_environment = 'sandbox', store_name = '',
      logo_data_url = null, primary_color = '#1f4d3a', support_text = '', checkout_active = false,
      sandbox_test_passed_at = null, updated_by = null
  `);
  await db.execute(sql`
    update velo.checkout_domain set hostname = null, dns_status = 'not_started', https_status = 'not_started',
      apple_pay_status = 'not_started', last_checked_at = null, updated_by = null
  `);
  await db.execute(sql`
    update velo.shopify_connection set shop_domain = null, status = 'disconnected', granted_scopes = '{}',
      access_token_ciphertext = null, oauth_state_hash = null, oauth_state_expires_at = null, installed_at = null,
      uninstalled_at = null, last_verified_at = null, last_error = null
  `);
  await db.execute(sql`
    update velo.whop_connections set status = 'disconnected', company_id = null, account_name = null,
      api_key_ciphertext = null, webhook_secret_ciphertext = null, webhook_endpoint_url = null,
      webhook_status = 'not_configured', webhook_last_event_at = null, last_verified_at = null, last_error = null
  `);
}
