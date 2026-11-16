<div align="center">

# 🌭 Hot Grill

**Gestão operacional e financeira de uma barraca de hot dog personalizado.**

Sistema web interno criado para a equipe de uma barraca em uma Feira de Negócios: cada venda registra os ingredientes exatos usados, e o estoque, o custo e o lucro se atualizam sozinhos.

![Status](https://img.shields.io/badge/status-em%20uso-F97316?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

---

## 💡 O problema

No hot dog personalizado, cada cliente escolhe ingredientes diferentes. Registrar só "1 hot dog vendido" deixa o estoque, o custo e o lucro errados. O Hot Grill resolve isso registrando **cada ingrediente consumido em cada venda**.

## ✨ Funcionalidades

| Módulo | O que faz |
| --- | --- |
| 📦 **Estoque** | Cadastro de insumos com quantidade, unidade, valor unitário e estoque mínimo. O valor total é calculado automaticamente |
| 🛒 **Vendas** | Registro de hot dog personalizado (montado por ingrediente), combo, refrigerante e trufa, com a forma de pagamento |
| 🔄 **Baixa automática** | Cada venda desconta do estoque os ingredientes usados e guarda o histórico de movimentações |
| 🚫 **Trava de estoque** | Impede vender o que não tem estoque disponível |
| 💰 **Financeiro** | Controle de despesas, CMV e margem por venda |
| 📊 **DRE e balanço** | Demonstrativo de resultado e balanço patrimonial calculados a partir dos dados lançados |
| 📈 **Relatórios** | Resumo das vendas por produto e por forma de pagamento (Pix, dinheiro e cartão) |
| 🔐 **Acesso da equipe** | Login restrito, com área interna protegida |

## 🛠️ Tecnologias

- **Front-end:** React 19, TypeScript, TanStack Start e TanStack Router
- **Interface:** Tailwind CSS 4, Radix UI e gráficos com Recharts
- **Back-end e banco:** Supabase (PostgreSQL, autenticação e migrations versionadas)
- **Build e ferramentas:** Vite, Bun, ESLint e Prettier

## 🗄️ Modelo de dados

| Tabela | Função |
| --- | --- |
| `ingredientes` | Insumos, quantidade atual, valor unitário e estoque mínimo |
| `vendas` | Cada venda, com valor, forma de pagamento e CMV |
| `itens_venda` | Ingredientes consumidos em cada venda e seu custo |
| `movimentacoes_estoque` | Histórico de entradas e baixas |
| `despesas` | Despesas pagas e a pagar, por categoria |
| `configuracoes` | Parâmetros do sistema |
| `user_roles` | Papéis de acesso dos usuários |

## 🚀 Como rodar localmente

### Pré-requisitos

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/)
- Um projeto no [Supabase](https://supabase.com/)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/cryyww/hotgrillww.git
cd hotgrillww

# 2. Instale as dependências
bun install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com os dados do seu projeto Supabase

# 4. Aplique as migrations (pasta supabase/migrations) no seu projeto Supabase

# 5. Inicie o servidor de desenvolvimento
bun run dev
```

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço, usada só no servidor. **Nunca a envie para o Git** |

### Scripts

| Comando | Função |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção |
| `bun run lint` | Análise com ESLint |

## 🗂️ Estrutura

```text
src/
├── routes/
│   ├── auth.tsx            # Login da equipe
│   └── _authenticated/     # Vendas, estoque, financeiro e relatórios
├── integrations/supabase/  # Cliente e autenticação
├── components/             # KPIs e estados de tela
└── lib/hotgrill.ts         # Tipos e regras do negócio
supabase/
└── migrations/             # Estrutura do banco de dados
```

## 👤 Autor

**Gabriel Bomfim**: desenvolvedor full stack júnior e estudante de Sistemas de Informação.

[![GitHub](https://img.shields.io/badge/GitHub-cryyww-181717?style=flat-square&logo=github)](https://github.com/cryyww)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Gabriel%20Bomfim-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/gabriel-bomfim-3082362b3)
