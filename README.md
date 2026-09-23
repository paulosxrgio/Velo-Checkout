# Velo Checkout

Checkout próprio para uma loja Shopify, com pagamento pela Whop, e painel para configurar a operação.

**Etapa atual: somente frontend.** Todos os dados são demonstrativos. Não há conexão com lojas, criação de cobranças, webhooks nem criação de pedidos.

## Como rodar

Requisitos: Node.js 20.9+ (testado com Node 22) e npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Outros comandos:

```bash
npm run lint         # ESLint (regras do Next.js e do React Compiler)
npm run typecheck    # gera os tipos de rota e roda o tsc
npm run build        # build de produção
npm run start        # serve o build de produção
```

Opcional: copie `.env.example` para `.env.local`. A única variável é `NEXT_PUBLIC_DATA_SOURCE=demo`.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript.** O frontend já está pronto, e as próximas etapas podem usar rotas de servidor no mesmo projeto e no mesmo domínio do checkout:
  - criar a sessão da Whop;
  - receber webhooks;
  - fazer o OAuth da Shopify;
  - validar preços no servidor.
- **Tailwind CSS v4**, com tokens em `src/app/globals.css`, e **lucide-react** para os ícones.
- **Geist** (pacote `geist`), com a fonte servida localmente, sem requisições externas.
- **@whop/checkout**: o componente oficial `WhopCheckoutEmbed` só é carregado quando existir uma sessão real.

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Índice de desenvolvimento, com atalhos para os cenários e o painel |
| `/checkout?carrinho=<token>` | Checkout de uma página |
| `/checkout/confirmacao?tentativa=<id>` | Status do pagamento, consultado na camada de dados |
| `/admin` | Visão geral |
| `/admin/configuracao` | Configuração guiada: Shopify → Whop → domínio → aparência → teste → ativação |
| `/admin/shopify` | Conexão da loja e permissões necessárias |
| `/admin/whop` | Conta, modo sandbox/produção e webhook |
| `/admin/dominio` | Subdomínio, DNS, HTTPS e Apple Pay |
| `/admin/aparencia` | Logotipo, cor, nome, texto de suporte e prévia |
| `/admin/pedidos` | Lista, com filtros e busca |
| `/admin/pedidos/[id]` | Detalhe com IDs, valores e linha do tempo |
| `/admin/configuracoes` | Ambiente, dados da operação e checklist de ativação |

### Cenários de demonstração do checkout

| Token | Cenário |
| --- | --- |
| `demo` | Carrinho com três produtos |
| `demo-indisponivel` | Um item esgotado depois de entrar no carrinho |
| `demo-preco-alterado` | Preço de um item mudou desde o carrinho |
| `demo-vazio` | Carrinho vazio |
| `demo-expirado` | Link de checkout expirado |

Dados de teste:
- **Cupons:** `BEMVINDO10`, `FRETEGRATIS` e `EXPIRADO`.
- **CEP `01310-100`:** preenche o endereço automaticamente.
- **CEP `99999-999`:** simula uma região sem entrega.
- **CPF válido de teste:** `529.982.247-25`.

Na etapa de pagamento, o painel de demonstração simula quatro resultados: aprovado, recusado, pendente e falha posterior. Ele não exibe campos de cartão.

## Arquitetura

```
src/
  domain/        tipos e regras puras (sem React): carrinho, cotação, pagamento, conexões, pedidos
  data/
    contracts.ts CheckoutGateway e AdminGateway — o único contrato que as telas conhecem
    demo/        adaptador demonstrativo (dados fictícios, latência simulada, localStorage)
    index.ts     ponto único de troca da fonte de dados
  components/
    ui/          primitivos (botão, campos, badges, callouts, cartões…)
    checkout/    componentes visuais do checkout; payment/ isola a Whop
    admin/       componentes visuais do painel
  features/      containers: hooks + ligação entre dados e componentes
  app/           rotas (páginas finas que só montam as features)
```

Princípios:

- **Componentes visuais não buscam dados.** Os hooks em `src/features` chamam os gateways e repassam props aos componentes.
- **O cliente não calcula preços de forma confiável.** Todo total vem da `Quote` devolvida pelo gateway. O adaptador demonstrativo simula o servidor e não deve ser reaproveitado no cliente real.
- **Nenhum segredo no navegador.** Tokens da Shopify e chaves da Whop ficam somente no servidor. O painel nunca pede para colar tokens.
- **Confirmação vem do servidor.** A página de confirmação consulta `getPaymentAttempt` periodicamente. Voltar da Whop ou receber `onComplete` não confirma o pagamento.
- **Dados demonstrativos são sempre identificados:**
  - faixa violeta tracejada no checkout;
  - selos "Demonstração" no painel;
  - IDs com `demo`;
  - domínios `.example`.

  Botões de conectar, verificar e ativar ficam desabilitados, com o motivo explicado.
- **Loja única.** Não há seleção de loja nem modelo multi-loja nesta etapa.

### Para integrar as APIs reais

1. Implemente `CheckoutGateway` e `AdminGateway` em `src/data/http/`, chamando rotas próprias em `src/app/api/...`.
2. Selecione o adaptador em `src/data/index.ts` a partir de `NEXT_PUBLIC_DATA_SOURCE`.
3. Em `createPaymentAttempt`, o servidor deve:
   - revalidar preços, estoque e frete;
   - congelar a cotação;
   - criar a sessão na Whop.

   Ele devolve `session: { kind: "whop_embed", sessionId, environment, returnUrl }`. O componente `WhopCheckoutSlot` passa então a renderizar o `WhopCheckoutEmbed`.

## O que já funciona no frontend

- **Checkout de uma página**, responsivo:
  - resumo recolhível no celular;
  - edição de quantidade com limite de estoque e remoção de itens;
  - cupom com estados de aplicação e erro;
  - CEP com busca e preenchimento manual;
  - frete com cálculo, erro e região sem entrega;
  - totais discriminados (subtotal, descontos, frete e impostos);
  - validação com resumo de erros acessível;
  - estados de carrinho vazio, item indisponível, preço alterado e link expirado;
  - área isolada para a Whop, com os estados aguardando pagamento e recusado.
- **Página de confirmação** com consulta periódica ao status. Estados: pagamento confirmado (pedido em criação ou criado), confirmação pendente, não aprovado, expirado, aguardando e não encontrado.
- **Painel completo e navegável.** Aparência, subdomínio e ambiente são salvos no `localStorage` (demonstração), e a aparência salva reflete no checkout demonstrativo.
- **Acessibilidade:**
  - rótulos e `aria-describedby` nos campos;
  - regiões `aria-live` para cálculos;
  - foco gerenciado;
  - link para pular ao conteúdo;
  - alvos de toque confortáveis;
  - `prefers-reduced-motion`;
  - verificação de contraste da cor da marca.

## O que depende do backend (próximas etapas)

- **Repasse do carrinho da Shopify.** Botão "Finalizar compra" no tema, token assinado e leitura do carrinho no servidor. O tema não foi alterado.
- **Instalação e OAuth do app Shopify**, com as permissões listadas em `/admin/shopify`. Inclui a aprovação para dados protegidos de clientes fora de lojas de desenvolvimento.
- **Autenticação com a Whop, sessões de checkout e webhook** com verificação de assinatura.
- **Cálculo real de frete, cupons e impostos**, e busca real de CEP.
- **Criação do pedido na Shopify** após o pagamento confirmado, com novas tentativas e alertas. Inclui a ação "Tentar criar pedido novamente".
- **Restauração do checkout após o `returnUrl` da Whop** (fluxos de autorização externos).
- **Domínio:**
  - hospedagem e valores de DNS;
  - verificação de DNS e HTTPS;
  - registro do domínio de pagamento para Apple Pay no painel da Whop.
- **Persistência real** das configurações, autenticação do painel e ativação do checkout.

## Referências consultadas

- Tipos publicados no pacote oficial `@whop/checkout` (0.7.0):
  - props `sessionId`, `environment` (`"production" | "sandbox"`), `returnUrl`, `prefill`, `themeOptions`, `onComplete`, `onPaymentError` e `fallback`.
- Documentação da Whop sobre Apple Pay no checkout incorporado:
  - o domínio de pagamento é registrado no painel da Whop, com verificação por DNS ou por arquivo hospedado;
  - Apple Pay não aparece no sandbox.
- Documentação da Shopify sobre escopos de acesso e dados protegidos de clientes.
