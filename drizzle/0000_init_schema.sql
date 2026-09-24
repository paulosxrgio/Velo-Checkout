CREATE SCHEMA "velo";
--> statement-breakpoint
CREATE TABLE "velo"."admin_login_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "velo"."admin_login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"ip_address" text,
	"succeeded" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "velo"."admin_login_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip_address" text
);
--> statement-breakpoint
ALTER TABLE "velo"."admin_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_key" UNIQUE("email"),
	CONSTRAINT "admin_users_email_lowercase" CHECK ("velo"."admin_users"."email" = lower("velo"."admin_users"."email"))
);
--> statement-breakpoint
ALTER TABLE "velo"."admin_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handoff_token_hash" text NOT NULL,
	"shop_domain" text,
	"shopify_cart_token" text,
	"currency_code" char(3) NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"rejection_reason" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_handoff_token_hash_key" UNIQUE("handoff_token_hash"),
	CONSTRAINT "carts_status" CHECK ("velo"."carts"."status" in ('received', 'validated', 'rejected', 'expired', 'converted')),
	CONSTRAINT "carts_currency" CHECK ("velo"."carts"."currency_code" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "velo"."carts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."checkout_domain" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"hostname" text,
	"dns_status" text DEFAULT 'not_started' NOT NULL,
	"https_status" text DEFAULT 'not_started' NOT NULL,
	"apple_pay_status" text DEFAULT 'not_started' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_domain_hostname_key" UNIQUE("hostname"),
	CONSTRAINT "checkout_domain_singleton" CHECK ("velo"."checkout_domain"."id" = 1),
	CONSTRAINT "checkout_domain_hostname_lowercase" CHECK ("velo"."checkout_domain"."hostname" = lower("velo"."checkout_domain"."hostname")),
	CONSTRAINT "checkout_domain_dns_status" CHECK ("velo"."checkout_domain"."dns_status" in ('not_started', 'pending', 'verified', 'failed')),
	CONSTRAINT "checkout_domain_https_status" CHECK ("velo"."checkout_domain"."https_status" in ('not_started', 'pending', 'verified', 'failed')),
	CONSTRAINT "checkout_domain_apple_pay_status" CHECK ("velo"."checkout_domain"."apple_pay_status" in ('not_started', 'pending', 'verified', 'failed')),
	CONSTRAINT "checkout_domain_verified_requires_check" CHECK (("velo"."checkout_domain"."dns_status" <> 'verified' and "velo"."checkout_domain"."https_status" <> 'verified' and "velo"."checkout_domain"."apple_pay_status" <> 'verified')
          or ("velo"."checkout_domain"."hostname" is not null and "velo"."checkout_domain"."last_checked_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "velo"."checkout_domain" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."operation_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"operation_name" text DEFAULT '' NOT NULL,
	"alert_email" text,
	"store_url" text,
	"currency_code" char(3) DEFAULT 'BRL' NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"payment_environment" text DEFAULT 'sandbox' NOT NULL,
	"store_name" text DEFAULT '' NOT NULL,
	"logo_data_url" text,
	"primary_color" text DEFAULT '#1f4d3a' NOT NULL,
	"support_text" text DEFAULT '' NOT NULL,
	"checkout_active" boolean DEFAULT false NOT NULL,
	"sandbox_test_passed_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operation_settings_singleton" CHECK ("velo"."operation_settings"."id" = 1),
	CONSTRAINT "operation_settings_environment" CHECK ("velo"."operation_settings"."payment_environment" in ('sandbox', 'production')),
	CONSTRAINT "operation_settings_primary_color" CHECK ("velo"."operation_settings"."primary_color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "operation_settings_currency" CHECK ("velo"."operation_settings"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "operation_settings_activation_requires_test" CHECK (not "velo"."operation_settings"."checkout_active" or "velo"."operation_settings"."sandbox_test_passed_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "velo"."operation_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" bigint GENERATED ALWAYS AS IDENTITY (sequence name "velo"."payment_attempts_order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1),
	"cart_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider" text DEFAULT 'whop' NOT NULL,
	"environment" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"amount" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"whop_checkout_session_id" text,
	"whop_payment_id" text,
	"customer_email" text NOT NULL,
	"customer" jsonb NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"paid_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"shopify_sync_status" text DEFAULT 'not_started' NOT NULL,
	"shopify_order_id" text,
	"shopify_order_name" text,
	"shopify_sync_attempts" integer DEFAULT 0 NOT NULL,
	"shopify_last_error" text,
	"shopify_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_order_number_key" UNIQUE("order_number"),
	CONSTRAINT "payment_attempts_idempotency_key_key" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_attempts_whop_session_key" UNIQUE("whop_checkout_session_id"),
	CONSTRAINT "payment_attempts_whop_payment_key" UNIQUE("whop_payment_id"),
	CONSTRAINT "payment_attempts_shopify_order_key" UNIQUE("shopify_order_id"),
	CONSTRAINT "payment_attempts_provider" CHECK ("velo"."payment_attempts"."provider" = 'whop'),
	CONSTRAINT "payment_attempts_environment" CHECK ("velo"."payment_attempts"."environment" in ('sandbox', 'production')),
	CONSTRAINT "payment_attempts_status" CHECK ("velo"."payment_attempts"."status" in ('created', 'awaiting_payment', 'processing', 'paid', 'failed', 'expired', 'canceled', 'refunded')),
	CONSTRAINT "payment_attempts_sync_status" CHECK ("velo"."payment_attempts"."shopify_sync_status" in ('not_started', 'pending', 'synced', 'failed')),
	CONSTRAINT "payment_attempts_amount_positive" CHECK ("velo"."payment_attempts"."amount" > 0),
	CONSTRAINT "payment_attempts_paid_requires_confirmation" CHECK ("velo"."payment_attempts"."status" not in ('paid', 'refunded') or ("velo"."payment_attempts"."paid_at" is not null and "velo"."payment_attempts"."whop_payment_id" is not null)),
	CONSTRAINT "payment_attempts_sync_requires_payment" CHECK ("velo"."payment_attempts"."shopify_sync_status" = 'not_started' or "velo"."payment_attempts"."status" in ('paid', 'refunded')),
	CONSTRAINT "payment_attempts_synced_requires_order" CHECK ("velo"."payment_attempts"."shopify_sync_status" <> 'synced' or ("velo"."payment_attempts"."shopify_order_id" is not null and "velo"."payment_attempts"."shopify_synced_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "velo"."payment_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"currency_code" char(3) NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"shipping_amount" bigint DEFAULT 0 NOT NULL,
	"tax_amount" bigint DEFAULT 0 NOT NULL,
	"taxes_included" boolean DEFAULT true NOT NULL,
	"total_amount" bigint NOT NULL,
	"discount_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"shipping_rate" jsonb,
	"line_items" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_cart_version_key" UNIQUE("cart_id","version"),
	CONSTRAINT "quotes_status" CHECK ("velo"."quotes"."status" in ('open', 'locked', 'superseded', 'expired')),
	CONSTRAINT "quotes_amounts_non_negative" CHECK ("velo"."quotes"."subtotal_amount" >= 0 and "velo"."quotes"."discount_amount" >= 0 and "velo"."quotes"."shipping_amount" >= 0 and "velo"."quotes"."tax_amount" >= 0 and "velo"."quotes"."total_amount" >= 0),
	CONSTRAINT "quotes_total_matches_parts" CHECK ("velo"."quotes"."total_amount" = "velo"."quotes"."subtotal_amount" - "velo"."quotes"."discount_amount" + "velo"."quotes"."shipping_amount" + case when "velo"."quotes"."taxes_included" then 0 else "velo"."quotes"."tax_amount" end),
	CONSTRAINT "quotes_locked_requires_timestamp" CHECK ("velo"."quotes"."status" <> 'locked' or "velo"."quotes"."locked_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "velo"."quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."shopify_connection" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"shop_domain" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"granted_scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"access_token_ciphertext" text,
	"oauth_state_hash" text,
	"oauth_state_expires_at" timestamp with time zone,
	"installed_at" timestamp with time zone,
	"uninstalled_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopify_connection_singleton" CHECK ("velo"."shopify_connection"."id" = 1),
	CONSTRAINT "shopify_connection_status" CHECK ("velo"."shopify_connection"."status" in ('disconnected', 'connecting', 'connected', 'error')),
	CONSTRAINT "shopify_connection_shop_domain" CHECK ("velo"."shopify_connection"."shop_domain" ~ '^[a-z0-9][a-z0-9-]*\.myshopify\.com$'),
	CONSTRAINT "shopify_connection_connected_requires_verification" CHECK ("velo"."shopify_connection"."status" <> 'connected' or ("velo"."shopify_connection"."shop_domain" is not null and "velo"."shopify_connection"."access_token_ciphertext" is not null and "velo"."shopify_connection"."last_verified_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "velo"."shopify_connection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_sha256" text NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payment_attempt_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_events_provider_event_key" UNIQUE("provider","provider_event_id"),
	CONSTRAINT "webhook_events_provider" CHECK ("velo"."webhook_events"."provider" in ('whop', 'shopify')),
	CONSTRAINT "webhook_events_status" CHECK ("velo"."webhook_events"."status" in ('received', 'processing', 'processed', 'ignored', 'failed')),
	CONSTRAINT "webhook_events_processed_requires_signature" CHECK ("velo"."webhook_events"."status" <> 'processed' or "velo"."webhook_events"."signature_verified")
);
--> statement-breakpoint
ALTER TABLE "velo"."webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "velo"."whop_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"company_id" text,
	"account_name" text,
	"api_key_ciphertext" text,
	"webhook_secret_ciphertext" text,
	"webhook_endpoint_url" text,
	"webhook_status" text DEFAULT 'not_configured' NOT NULL,
	"webhook_last_event_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whop_connections_environment_key" UNIQUE("environment"),
	CONSTRAINT "whop_connections_environment" CHECK ("velo"."whop_connections"."environment" in ('sandbox', 'production')),
	CONSTRAINT "whop_connections_status" CHECK ("velo"."whop_connections"."status" in ('disconnected', 'connected', 'error')),
	CONSTRAINT "whop_connections_webhook_status" CHECK ("velo"."whop_connections"."webhook_status" in ('not_configured', 'pending', 'active', 'failing')),
	CONSTRAINT "whop_connections_connected_requires_verification" CHECK ("velo"."whop_connections"."status" <> 'connected' or ("velo"."whop_connections"."api_key_ciphertext" is not null and "velo"."whop_connections"."company_id" is not null and "velo"."whop_connections"."last_verified_at" is not null)),
	CONSTRAINT "whop_connections_webhook_active_requires_event" CHECK ("velo"."whop_connections"."webhook_status" <> 'active' or ("velo"."whop_connections"."webhook_secret_ciphertext" is not null and "velo"."whop_connections"."webhook_last_event_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "velo"."whop_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "velo"."admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "velo"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velo"."checkout_domain" ADD CONSTRAINT "checkout_domain_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "velo"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velo"."operation_settings" ADD CONSTRAINT "operation_settings_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "velo"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velo"."payment_attempts" ADD CONSTRAINT "payment_attempts_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "velo"."carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velo"."payment_attempts" ADD CONSTRAINT "payment_attempts_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "velo"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velo"."quotes" ADD CONSTRAINT "quotes_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "velo"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velo"."webhook_events" ADD CONSTRAINT "webhook_events_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "velo"."payment_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_login_attempts_email_idx" ON "velo"."admin_login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX "admin_login_attempts_ip_idx" ON "velo"."admin_login_attempts" USING btree ("ip_address","attempted_at");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "velo"."admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "velo"."admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "carts_status_expires_idx" ON "velo"."carts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_one_active_per_quote" ON "velo"."payment_attempts" USING btree ("quote_id") WHERE "velo"."payment_attempts"."status" in ('created', 'awaiting_payment', 'processing');--> statement-breakpoint
CREATE INDEX "payment_attempts_status_idx" ON "velo"."payment_attempts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payment_attempts_sync_idx" ON "velo"."payment_attempts" USING btree ("shopify_sync_status");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_one_open_per_cart" ON "velo"."quotes" USING btree ("cart_id") WHERE "velo"."quotes"."status" = 'open';--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "velo"."webhook_events" USING btree ("status","received_at");