# Cantina Escolar Pro

Sistema web para apoiar a operação de uma cantina escolar. Reúne registro de vendas, consulta de alunos e produtos, acompanhamento de estoque e um resumo dos resultados em uma interface responsiva.

## Funcionalidades

- **Operação de vendas:** selecionar um aluno, montar o carrinho e registrar uma venda.
- **Alunos:** consultar alunos cadastrados, dados dos responsáveis e abrir uma conversa no WhatsApp.
- **Produtos e estoque:** consultar produtos, preços e quantidades disponíveis.
- **Gestão:** cadastrar alunos, produtos e operadores pela interface de gestor.
- **Visão geral:** consultar faturamento, quantidade de vendas e produtos mais vendidos.
- **Acesso:** login com e-mail e senha; a sessão é mantida em um cookie HTTP-only.

> O WhatsApp é aberto pelo navegador com uma mensagem preparada; o sistema não envia mensagens automaticamente.

## Tecnologias

- Next.js 16 com App Router e React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Drizzle ORM e Drizzle Kit
- JWT de sessão com `jose` e hashes de senha com `bcryptjs`

## Requisitos

- Node.js 20 ou superior
- npm
- Docker e Docker Compose para iniciar o PostgreSQL pelo arquivo fornecido; alternativamente, uma instância PostgreSQL acessível

## Configuração local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Crie um arquivo `.env.local` na raiz do projeto:

   ```dotenv
   DATABASE_URL=postgres://cantina_user:cantina_pass@localhost:5432/cantina_db
   SESSION_SECRET=troque-por-um-segredo-aleatorio-longo
   ```

   `DATABASE_URL` deve apontar para o PostgreSQL. `SESSION_SECRET` assina os tokens de sessão: use um valor aleatório e exclusivo fora do ambiente local. O projeto possui valores de fallback para desenvolvimento, que **não devem ser usados em produção**.

3. Inicie o banco de dados local com Docker Compose:

   ```bash
   docker compose up -d postgres
   ```

   O serviço cria o banco `cantina_db` na porta `5432`, com usuário `cantina_user` e senha `cantina_pass`, conforme o exemplo acima. Se já tiver um PostgreSQL, configure `DATABASE_URL` para essa instância.

4. Sincronize o schema do projeto com o banco:

   ```bash
   npm run db:push
   ```

5. (Opcional) Carregue dados para experimentar o sistema:

   ```bash
   npm run db:seed
   ```

   **Atenção:** o seed remove os registros existentes de pedidos, itens, produtos, alunos e usuários antes de inserir os dados de exemplo. Não o execute em um banco com dados que deseja preservar.

6. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000). As páginas do sistema exigem login e redirecionam para `/login` quando não há sessão.

### Contas de demonstração

Disponíveis após executar o seed:

| Perfil | E-mail | Senha |
|---|---|---|
| Gestor | `gestor@cantina.com` | `manager123` |
| Operador | `operador1@cantina.com` | `operator123` |
| Operador | `operador2@cantina.com` | `operator123` |

Essas credenciais são somente para desenvolvimento e demonstração. Altere-as e não as reutilize em produção.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js. |
| `npm run build` | Gera a build de produção. |
| `npm run start` | Inicia o servidor Next.js em modo de produção, após a build. |
| `npm run lint` | Executa o ESLint. |
| `npm run db:push` | Sincroniza o schema Drizzle com o banco configurado. |
| `npm run db:seed` | Apaga os registros das tabelas do sistema e carrega dados de demonstração. |

## Estrutura do projeto

```text
app/
  api/
    auth/               Rotas de login, sessão e logout
    cantina/            Dados da cantina e operações de venda/cadastro
  dashboard/            Painel de operação e gestão
  login/                Tela de login
  globals.css           Estilos globais e tema
  layout.tsx            Layout raiz e importação do CSS
components/
  AuthProvider.tsx      Estado de autenticação no cliente
db/
  index.ts              Conexão com PostgreSQL e Drizzle
  schema.ts             Tabelas do banco
  seeds.ts              Dados de demonstração
drizzle/                Migrações e metadados Drizzle
lib/
  auth.ts               Criação e validação de sessões
middleware.ts            Redirecionamento de páginas sem sessão
```

## Modelo de dados

O schema em `db/schema.ts` define:

- **users:** usuários, e-mail, hash de senha e perfil.
- **students:** aluno, turma e dados do responsável.
- **products:** nome, preço em centavos, estoque e imagem opcional.
- **orders:** venda, aluno, operador, valor total e mensagem preparada para WhatsApp.
- **order_items:** produtos, quantidades e valores registrados em cada venda.

Os preços são armazenados em centavos. Ao registrar uma venda, o sistema cria o pedido e seus itens e reduz o estoque dos produtos.

## Rotas da API

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Valida e-mail e senha e inicia uma sessão. |
| `GET` | `/api/auth/session` | Retorna o usuário da sessão atual. |
| `POST` | `/api/auth/logout` | Encerra a sessão atual. |

### Cantina

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/cantina?type=students` | Lista alunos. |
| `GET` | `/api/cantina?type=products` | Lista produtos e estoque. |
| `GET` | `/api/cantina?type=operators` | Lista operadores. |
| `GET` | `/api/cantina?type=dashboard` | Retorna totais e produtos mais vendidos. |
| `GET` | `/api/cantina?type=student-sales&id=<uuid>` | Lista vendas de um aluno. |
| `POST` | `/api/cantina` | Cria um aluno, produto, operador ou venda, conforme `action`. |

As ações atualmente aceitas pelo `POST /api/cantina` são `create_student`, `create_product`, `create_operator` e `create_sale`. Envie os dados como JSON.

## Docker

O `docker-compose.yml` disponibiliza **somente o PostgreSQL**. Para desenvolvimento, inicie-o com:

```bash
docker compose up -d postgres
```

O `Dockerfile` constrói a aplicação Next.js em modo `standalone`, mas não há um serviço da aplicação definido no Compose. Para executar essa imagem em produção, configure no ambiente do contêiner `DATABASE_URL` e `SESSION_SECRET`, além de disponibilizar um PostgreSQL. Não use as credenciais de exemplo nem o segredo de fallback em um ambiente público.

## Observações importantes antes de produção

- O middleware protege páginas do site, mas exclui as rotas `/api/*` do matcher. As rotas da API da cantina ainda não aplicam autenticação ou autorização; portanto, **não exponha a aplicação publicamente antes de proteger essas rotas**.
- O cadastro de operador cria uma conta sem senha definida. Configure um fluxo seguro de definição ou recuperação de senha antes de habilitar o acesso desses usuários.
- Defina `SESSION_SECRET` como um segredo longo, aleatório e exclusivo do ambiente.
- Não use os dados, telefones nem credenciais de demonstração em uma instalação real.

## Desenvolvimento

- Páginas e layouts usam o App Router em `app/`.
- O CSS global e a entrada do Tailwind são definidos em `app/globals.css`, importado pelo layout raiz.
- O schema do banco e a conexão Drizzle estão em `db/schema.ts` e `db/index.ts`.
- Após alterar o schema, aplique as mudanças ao banco de desenvolvimento com `npm run db:push`.

