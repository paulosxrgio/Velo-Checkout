import type { ChecklistItem, OperationSnapshot, Order, SetupStep } from "./types";

/**
 * Regras derivadas do estado da operação. São funções puras para que a mesma
 * lógica possa rodar no servidor quando as integrações reais existirem.
 */

/** Pagamento confirmado sem pedido criado na Shopify: exige ação da operação. */
export function requiresAttention(order: Order): boolean {
  return order.payment.status === "paid" && order.shopify.status !== "synced";
}

export function buildSetupSteps(snapshot: OperationSnapshot): SetupStep[] {
  const { shopify, whop, domain, appearance } = snapshot;
  const shopifyDone = shopify.status === "connected";
  const whopDone = whop.status === "connected";
  const domainDone = domain.dnsStatus === "verified" && domain.httpsStatus === "verified";
  const appearanceDone = Boolean(appearance.storeName.trim()) && Boolean(appearance.primaryColor);
  const integrationsReady = shopifyDone && whopDone;

  return [
    {
      id: "shopify",
      title: "Conectar Shopify",
      description: "Autorize o app na sua loja para ler produtos e criar pedidos após o pagamento.",
      state: shopifyDone ? "done" : "integration_pending",
      cta: { label: shopifyDone ? "Ver conexão" : "Ir para Shopify", href: "/admin/shopify" },
      note: shopifyDone ? undefined : "O fluxo de autorização será habilitado na etapa de backend.",
    },
    {
      id: "whop",
      title: "Conectar Whop",
      description: "Vincule a conta Whop que processará os pagamentos e enviará os webhooks.",
      state: whopDone ? "done" : "integration_pending",
      cta: { label: whopDone ? "Ver conexão" : "Ir para Whop", href: "/admin/whop" },
      note: whopDone ? undefined : "Integração pendente: a autenticação com a Whop ainda não foi definida.",
    },
    {
      id: "domain",
      title: "Configurar domínio",
      description: "Aponte um subdomínio da marca para o checkout e confirme o HTTPS.",
      state: domainDone ? "done" : "todo",
      cta: { label: domainDone ? "Ver domínio" : "Configurar domínio", href: "/admin/dominio" },
      note: domain.hostname && !domainDone ? "Subdomínio definido. A verificação depende do backend." : undefined,
    },
    {
      id: "appearance",
      title: "Ajustar aparência",
      description: "Logotipo, cor principal e texto de suporte exibidos ao comprador.",
      state: appearanceDone ? "done" : "todo",
      cta: { label: appearanceDone ? "Revisar aparência" : "Ajustar aparência", href: "/admin/aparencia" },
    },
    {
      id: "test",
      title: "Testar compra",
      description: "Faça um pedido completo em sandbox e confirme a criação do pedido na Shopify.",
      state: snapshot.sandboxTestPassed ? "done" : integrationsReady ? "todo" : "blocked",
      cta: { label: "Abrir checkout de demonstração", href: "/checkout?carrinho=demo" },
      note: integrationsReady ? undefined : "Requer Shopify e Whop conectadas. Já é possível navegar pelo checkout de demonstração.",
    },
    {
      id: "activate",
      title: "Ativar checkout",
      description: "Direcione os compradores da loja para o novo checkout.",
      state: snapshot.checkoutActive ? "done" : "blocked",
      cta: { label: "Ver checklist de ativação", href: "/admin/configuracoes" },
      note: snapshot.checkoutActive ? undefined : "Disponível quando todos os itens obrigatórios estiverem concluídos.",
    },
  ];
}

export function buildActivationChecklist(snapshot: OperationSnapshot): ChecklistItem[] {
  const { shopify, whop, domain, appearance, settings } = snapshot;
  return [
    {
      id: "shopify",
      label: "Loja Shopify conectada",
      description: "App autorizado com as permissões necessárias.",
      status: shopify.status === "connected" ? "ok" : "integration_pending",
      required: true,
      href: "/admin/shopify",
    },
    {
      id: "whop",
      label: "Conta Whop conectada",
      description: "Conta identificada e ambiente definido.",
      status: whop.status === "connected" ? "ok" : "integration_pending",
      required: true,
      href: "/admin/whop",
    },
    {
      id: "webhook",
      label: "Webhook da Whop ativo",
      description: "Eventos de pagamento chegando e com assinatura verificada no servidor.",
      status: whop.webhook.status === "active" ? "ok" : "integration_pending",
      required: true,
      href: "/admin/whop",
    },
    {
      id: "domain",
      label: "Domínio com DNS e HTTPS verificados",
      description: domain.hostname ? domain.hostname : "Nenhum subdomínio definido.",
      status: domain.dnsStatus === "verified" && domain.httpsStatus === "verified" ? "ok" : "pending",
      required: true,
      href: "/admin/dominio",
    },
    {
      id: "appearance",
      label: "Aparência revisada",
      description: "Nome da loja e cor principal definidos.",
      status: appearance.storeName.trim() && appearance.primaryColor ? "ok" : "pending",
      required: true,
      href: "/admin/aparencia",
    },
    {
      id: "sandbox-test",
      label: "Compra de teste em sandbox concluída",
      description: "Pagamento confirmado via webhook e pedido criado na Shopify.",
      status: snapshot.sandboxTestPassed ? "ok" : "pending",
      required: true,
    },
    {
      id: "production",
      label: "Ambiente de produção selecionado",
      description: "Pagamentos reais só acontecem em produção.",
      status: settings.environment === "production" ? "ok" : "pending",
      required: true,
    },
    {
      id: "apple-pay",
      label: "Domínio verificado para Apple Pay",
      description: "Necessário apenas para exibir Apple Pay no checkout incorporado.",
      status: domain.applePay.status === "verified" ? "ok" : "optional",
      required: false,
      href: "/admin/dominio",
    },
  ];
}

export function canActivate(checklist: ChecklistItem[]): boolean {
  return checklist.every((item) => !item.required || item.status === "ok");
}
