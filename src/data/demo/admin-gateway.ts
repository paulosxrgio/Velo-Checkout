import type { AppearanceSettings, OperationSettings, StorefrontInfo } from "@/domain/types";
import type { AdminGateway } from "../contracts";
import {
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  DEFAULT_SHOPIFY,
  DEFAULT_WHOP,
  buildDemoOrders,
  defaultDomainSettings,
} from "./fixtures";
import { readDemo, simulateLatency, writeDemo } from "./storage";

/**
 * Adaptador demonstrativo do painel.
 * Conexões ficam sempre desconectadas ou com "integração pendente": nada aqui
 * simula uma conexão funcional. Preferências editáveis (aparência, domínio e
 * operação) ficam salvas apenas neste navegador.
 */

const KEYS = { appearance: "appearance", settings: "settings", hostname: "hostname" } as const;

function readAppearance(): AppearanceSettings {
  return { ...DEFAULT_APPEARANCE, ...readDemo<Partial<AppearanceSettings>>(KEYS.appearance, {}) };
}

function readSettings(): OperationSettings {
  return { ...DEFAULT_SETTINGS, ...readDemo<Partial<OperationSettings>>(KEYS.settings, {}) };
}

function readHostname(): string | null {
  return readDemo<string | null>(KEYS.hostname, null);
}

export function getDemoStorefront(): StorefrontInfo {
  const settings = readSettings();
  return {
    appearance: readAppearance(),
    storeUrl: settings.storeUrl,
    policies: [
      { title: "Trocas e devoluções", url: `${settings.storeUrl}/policies/refund-policy` },
      { title: "Privacidade", url: `${settings.storeUrl}/policies/privacy-policy` },
      { title: "Termos de serviço", url: `${settings.storeUrl}/policies/terms-of-service` },
    ],
  };
}

export const demoAdminGateway: AdminGateway = {
  async getSnapshot() {
    await simulateLatency(250, 500);
    return {
      shopify: DEFAULT_SHOPIFY,
      whop: { ...DEFAULT_WHOP, environment: readSettings().environment },
      domain: defaultDomainSettings(readHostname()),
      appearance: readAppearance(),
      settings: readSettings(),
      sandboxTestPassed: false,
      checkoutActive: false,
    };
  },

  async getShopifyConnection() {
    await simulateLatency(250, 500);
    return DEFAULT_SHOPIFY;
  },

  async getWhopConnection() {
    await simulateLatency(250, 500);
    return { ...DEFAULT_WHOP, environment: readSettings().environment };
  },

  async getDomainSettings() {
    await simulateLatency(250, 500);
    return defaultDomainSettings(readHostname());
  },

  async saveCheckoutHostname(hostname) {
    await simulateLatency(400, 700);
    const normalized = hostname.trim().toLowerCase();
    writeDemo(KEYS.hostname, normalized);
    return defaultDomainSettings(normalized);
  },

  async getAppearance() {
    await simulateLatency(200, 400);
    return readAppearance();
  },

  async saveAppearance(appearance) {
    await simulateLatency(400, 700);
    writeDemo(KEYS.appearance, appearance);
    return readAppearance();
  },

  async getSettings() {
    await simulateLatency(200, 400);
    return readSettings();
  },

  async saveSettings(settings) {
    await simulateLatency(400, 700);
    writeDemo(KEYS.settings, settings);
    return readSettings();
  },

  async listOrders() {
    await simulateLatency(300, 600);
    return buildDemoOrders();
  },

  async getOrder(id) {
    await simulateLatency(250, 500);
    return buildDemoOrders().find((o) => o.id === id) ?? null;
  },
};
