# Velo Checkout

Checkout próprio para uma loja Shopify, com pagamento pela Whop, e painel para configurar a operação.

**Etapa atual:** frontend completo + base segura do backend:
- banco com migrações;
- login do painel;
- persistência no servidor de aparência, domínio e configurações.

Ainda **não** há conexão com a Shopify (OAuth), leitura de carrinho real, sessão ou webhook da Whop, nem criação de pedidos. Nenhuma conexão é marcada como ativa sem verificação real.

## Como rodar

Requisitos: Node.js 22 e um Postgres (o projeto usa o Postgres do Supabase).

```bash
npm install
cp .env.example .env.local        # preencha as variáveis (veja abaixo)
npm run db:migrate                # cria o schema "velo" e as linhas iniciais
npm run admin:create -- --email voce@empresa.com --name "Seu nome"
npm run dev                       # http://localhost:3000 → /admin pede login
```

Para ver apenas o checkout de demonstração, sem banco, use `NEXT_PUBLIC_DATA_SOURCE=demo npm run dev`. Nesse modo o painel fica indisponível.

### Configurar o Supabase

Todas as strings de conexão ficam em **Project → Connect** no painel do Supabase:

| Variável | Valor sugerido |
| --- | --- |
| `DATABASE_URL` | **Transaction pooler** (porta 6543). O código já desativa prepared statements, como esse modo exige. |
| `MIGRATION_DATABASE_URL` | **Session pooler** (porta 5432) ou conexão direta. É opcional: sem ela, as migrações usam `DATABASE_URL`. |

Conexões remotas usam TLS automaticamente. As chaves `anon` e `service_role` do Supabase **não** são usadas.

Onde ficam as tabelas:
- Todas as tabelas ficam no schema `velo`, que a API REST do Supabase não expõe.
- A migração remove qualquer acesso de `anon`/`authenticated` e liga RLS sem políticas (acesso negado por padrão).
- Só o servidor, conectado como dono do schema, lê e escreve.

### Variáveis de ambiente

| Variável | Onde | Obrigatória | Para quê |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_DATA_SOURCE` | build e navegador | sim | `api` (painel com login e banco) ou `demo` (só checkout de demonstração). Valor ausente ou inválido gera erro claro, sem recaída para demo. Não é segredo. |
| `DATABASE_URL` | somente servidor | sim, no modo `api` | Conexão Postgres da aplicação. |
| `MIGRATION_DATABASE_URL` | somente servidor | não | Conexão usada por `npm run db:migrate`. |
| `VELO_ENCRYPTION_KEY` | somente servidor | a partir das integrações | Chave AES-256 (32 bytes em base64) que cifra tokens da Shopify e chaves da Whop. Gere com `openssl rand -base64 32`. |
| `TEST_DATABASE_URL` | somente testes | para testes de integração | Postgres em que o usuário possa criar bancos. |

Nenhum segredo usa o prefixo `NEXT_PUBLIC_`.

## Comandos

```bash
npm run lint           # ESLint (regras do Next.js e do React Compiler)
npm run typecheck      # tipos de rota + tsc
npm test               # Vitest: unitários + integração (com TEST_DATABASE_URL)
npm run build          # build de produção
npm run db:migrate     # aplica as migrações versionadas em drizzle/
npm run db:generate    # gera uma nova migração a partir de src/server/db/schema.ts
npm run db:check       # confere a consistência das migrações
npm run admin:create -- --email e@x.com [--name "Nome"] [--reset-password]
```

Criação de administradores com `admin:create`:
- A senha é pedida sem eco no terminal. Para automação, pode vir de `ADMIN_PASSWORD` ou da entrada padrão.
- Exige ao menos 12 caracteres.
- `--reset-password` troca a senha e encerra as sessões abertas.

Testes de integração:
- Cada execução cria um banco novo, aplica as migrações do zero e o remove no final.
- Sem `TEST_DATABASE_URL`, esses testes são ignorados com aviso.

```bash
TEST_DATABASE_URL=postgresql://usuario:senha@127.0.0.1:5432/postgres npm test
```

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Índice de desenvolvimento |
| `/checkout?carrinho=<token>` | Checkout. Tokens `demo*` são cenários de demonstração. Os demais vão ao servidor, e a leitura de carrinho real ainda falha com erro explícito. |
| `/checkout/confirmacao?tentativa=<id>` | Status do pagamento |
| `/entrar` | Login do painel |
| `/admin/*` | Painel (exige sessão): visão geral, configuração guiada, Shopify, Whop, domínio, aparência, pedidos e configurações |
| `POST /api/auth/login` · `POST /api/auth/logout` | Sessão do painel |
| `/api/admin/*` | APIs do painel (exigem sessão): `snapshot`, `shopify`, `whop`, `domain` (GET/PUT), `appearance` (GET/PUT), `settings` (GET/PUT), `orders`, `orders/[id]` |

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
- **CEPs:** `01310-100` preenche o endereço; `99999-999` simula uma região sem entrega.
- **CPF:** `529.982.247-25`.

Os cenários usam a loja fictícia "Casa Aurora" e sempre exibem a faixa "Demonstração". Eles não leem nem misturam as configurações reais.

## Arquitetura

```
drizzle/             migrações SQL versionadas (geradas + endurecimento/seed)
scripts/             CLI: db-migrate.ts, create-admin.ts
src/
  domain/            tipos e regras puras (sem React e sem servidor)
  data/              camada usada pelas telas
    contracts.ts     CheckoutGateway e AdminGateway
    source.ts        seleção explícita da fonte (NEXT_PUBLIC_DATA_SOURCE)
    index.ts         único ponto de escolha dos adaptadores
    http/            painel → rotas /api/admin (sessão por cookie httpOnly)
    demo/            cenários de demonstração do checkout
    live/            checkout real (ainda não implementado: falha explicitamente)
  server/            somente servidor
    config.ts        leitura/validação de variáveis de ambiente (ConfigError)
    db/              schema Drizzle, conexão e migrações
    auth/            senha (scrypt), sessões, login com limite, DAL, cookie
    admin/           validação (zod), repositório e DTOs do painel
    checkout/        formato dos registros de checkout (próximas etapas)
    security/        cofre de segredos AES-256-GCM
    http/            envelope de resposta, erros, origem, leitura de JSON
  proxy.ts           checagem otimista do painel (Next 16: substitui middleware)
  app/               páginas e rotas de API (finas)
tests/               Vitest: unitários e integração com Postgres real
```

### Banco de dados

Schema `velo`, com Drizzle ORM e o driver `postgres`. Estados são `text` com `check`, e valores monetários ficam em centavos.

| Tabela | Conteúdo | Garantias |
| --- | --- | --- |
| `operation_settings` | operação, ambiente, aparência, ativação | Linha única (`id = 1`); ativação exige compra de teste registrada |
| `checkout_domain` | subdomínio e verificações | Nada fica "verificado" sem subdomínio e checagem registrada |
| `shopify_connection` | loja, escopos, token cifrado, estado OAuth | "Conectada" exige token cifrado e `last_verified_at` |
| `whop_connections` | uma linha por ambiente | "Conectada" exige chave cifrada e verificação; webhook "ativo" exige segredo e evento recebido |
| `carts` | carrinhos recebidos da loja | `handoff_token_hash` único: um repasse nunca gera dois carrinhos |
| `quotes` | cotações | Total precisa bater com as parcelas; uma cotação aberta por carrinho |
| `payment_attempts` | tentativas de pagamento e sincronização Shopify | `idempotency_key`, sessão Whop, pagamento Whop e pedido Shopify únicos; uma tentativa ativa por cotação; "pago" exige confirmação; sincronização só após pagamento |
| `webhook_events` | eventos recebidos | `(provider, provider_event_id)` único; "processado" exige assinatura verificada |
| `admin_users`, `admin_sessions`, `admin_login_attempts` | acesso ao painel | E-mail único em minúsculas; sessões guardam só o hash do token |

### Segurança

- **Autenticação:** sessões em banco, como no guia de autenticação do Next.js 16.
  - O cookie `__Host-velo_session` (em produção) é `httpOnly`, `Secure` e `SameSite=Lax` e guarda um token aleatório de 256 bits.
  - O banco guarda só o SHA-256 do token.
  - Expiração: 7 dias no total ou 12 horas sem uso. Logout e troca de senha revogam as sessões no servidor.
- **Autorização em camadas:**
  - `proxy.ts` faz só a checagem otimista do cookie.
  - O layout de `/admin` e cada rota `/api/admin` verificam a sessão no banco (`src/server/auth/dal.ts`).
- **Senhas:** scrypt (N=2¹⁵, r=8, p=3) com sal aleatório.
  - Login limitado a 5 falhas por e-mail e 30 por IP a cada 15 minutos.
  - A mensagem e o tempo de resposta são iguais para usuário inexistente, senha errada ou conta inativa.
- **Escritas:** exigem `Origin` igual ao servidor (proteção contra CSRF) e `Content-Type: application/json`, com limite de 1 MB.
  - A validação usa zod `strict`: campos desconhecidos (como "checkout ativo" ou estados de verificação) são recusados.
  - Produção só é aceita com Shopify e Whop conectadas.
- **Respostas:** DTOs com campos explícitos e `Cache-Control: no-store`. Colunas cifradas, hashes, estado de OAuth e CPF de compradores nunca aparecem nas APIs.
- **Segredos de integrações:** `sealSecret`/`openSecret` usam AES-256-GCM, com o contexto da coluna como dado autenticado e o identificador da chave no envelope. Preparado para as próximas etapas; nenhuma credencial real foi configurada.
- **Clickjacking:** o painel e o login enviam `X-Frame-Options: DENY` e `frame-ancestors 'none'`.
- **Configuração incompleta** falha de forma clara: tela explicativa no painel, `503` com instrução nas APIs e aviso no log ao iniciar.

## O que já funciona

- Checkout de demonstração completo: resumo, cupom, CEP, frete, totais, validação acessível, área da Whop e página de confirmação. O modo `demo` funciona sem banco.
- Login do painel e proteção de todas as páginas `/admin` e APIs `/api/admin`.
- Aparência, subdomínio, ambiente e dados da operação salvos no banco, iguais em qualquer navegador após o login.
- Pedidos lidos do banco (tentativas de pagamento). A lista fica vazia até o checkout real existir.

## Próximas etapas

- Instalação e OAuth do app Shopify, gravando o token com o cofre de segredos.
- Repasse do carrinho pelo tema, leitura e validação no servidor (`carts`, `quotes`).
- Autenticação com a Whop, sessão de checkout (`payment_attempts`) e webhook assinado (`webhook_events`).
- Criação do pedido na Shopify com novas tentativas; frete, cupons, impostos e CEP reais.
- Hospedagem, DNS/HTTPS e Apple Pay do domínio; logotipo em armazenamento de arquivos.

## Referências consultadas

- Guias locais do Next.js 16 (`node_modules/next/dist/docs`): autenticação (sessões em banco, DAL, DTO), `proxy`, route handlers e segurança de dados.
- Tipos do pacote oficial `@whop/checkout` 0.7.0.
- Documentação da Whop (Apple Pay no checkout incorporado) e da Shopify (escopos de acesso e dados protegidos de clientes).
