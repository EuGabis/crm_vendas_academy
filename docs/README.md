# Lito Academy Vendas — Documentação Completa

Sistema CRM/gestão de vendas da Lito Academy, com dashboards de time, ranking de vendedores, integração com DigitalManager Guru, CS e workspace pessoal.

---

## Sumário

### Docs técnicas (para quem desenvolve)

1. **[Arquitetura](arquitetura.md)** — stack, camadas, estrutura de pastas
2. **[Setup local](setup.md)** — clonar, instalar, rodar em dev
3. **[Módulos](modulos.md)** — todas as telas explicadas
4. **[Banco de dados](banco-dados.md)** — 17 tabelas, RLS, migrations
5. **[Integrações](integracoes.md)** — Supabase + DigitalManager Guru
6. **[Deploy](deploy.md)** — Vercel + env vars + limites Hobby
7. **[Operações](operacoes.md)** — criar admin, importar planilha, backup
8. **[Troubleshooting](troubleshooting.md)** — erros conhecidos + causas
9. **[Mapa de arquivos](mapa-arquivos.md)** — onde está cada coisa

### Docs de uso (para quem usa)

- **[Guia rápido](GUIA_RAPIDO.md)** — visão geral em 5 minutos
- **[Manual de teste](MANUAL_DE_TESTE.md)** — checklist completo pra validar cada tela

---

## Quick start

```bash
git clone https://github.com/LitoGroup/sistem_ju.git
cd sistem_ju
npm install
cp .env.example .env.local          # preenche com Supabase URL + anon key
npm run dev                          # http://localhost:5173
```

Precisa do banco montado. Veja **[Setup local](setup.md)** completo.

---

## Visão geral

O sistema tem **8 áreas** no menu lateral:

| Área | Rota base | Quem acessa | Fonte de dados |
|---|---|---|---|
| Receita | `/receita` | Todos | Supabase (`sales`) |
| Vendas | `/vendas/*` | Todos | Supabase (`sales`, `leads`, `sellers`, `monthly_goals`) |
| Marketing | `/marketing/*` | Todos | Supabase (`traffic_spend`) |
| Financeiro | `/financeiro/*` | **Admin** | DigitalManager Guru API |
| CS | `/cs/*` | Todos com scope | Supabase (`students`, `enrollments`, `cs_tickets`, ...) |
| Workspace | `/workspace/*` | Cada user vê o próprio | Supabase (`workspace_tasks`, `workspace_materials`) |
| Admin | `/admin/*` | **Admin** | Supabase (todos) |
| Configurações | `/configuracoes/*` | Perfil / Empresa (admin) | Supabase (`app_settings`, `user_settings`) |

Detalhes de cada uma em **[Módulos](modulos.md)**.

---

## Stack

- **Frontend**: React 18 + Vite 6 + TypeScript + Tailwind + shadcn/ui + Recharts
- **State**: TanStack Query (server) + Zustand (client) + Sonner (toasts)
- **Backend**: Vercel Serverless Functions (Node 20)
- **Banco**: PostgreSQL via Supabase self-hosted (`forgottenperch-supabase.cloudfy.live`)
- **Auth**: Supabase Auth com 4 roles (admin / manager / seller / viewer)
- **Deploy**: Vercel Hobby (limite 12 functions, 10s timeout)

Ver **[Arquitetura](arquitetura.md)** pra detalhes.

---

## Repositório

- **GitHub**: https://github.com/LitoGroup/sistem_ju
- **Produção Vercel**: https://crm-vendas-academy.vercel.app
- **Branch principal**: `main` — cada push dispara deploy automático
