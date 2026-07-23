# Módulos — telas do sistema

Cada tela do menu lateral explicada: propósito, filtros, ações, arquivo fonte, hooks usados, tabelas Supabase envolvidas.

---

## 1. Receita

**Rota**: `/receita` · **Arquivo**: `src/pages/Receita.tsx` · **Acesso**: todos

Card único mostrando receita consolidada do mês selecionado (filtro no header global).

- Puxa de: `sales` (todas as vendas do intervalo)
- Ícone: 📊 Receita
- **Uso principal**: bater olho rápido no faturamento

---

## 2. Vendas

Bloco com **6 telas** — o coração do sistema comercial.

### 2.1 Dashboard Times · `/vendas/dashboard-times`

Arquivo: `src/pages/DashboardTimes.tsx`

- KPIs consolidados: vendas do dia, semana, mês; receita total; conversão do funil
- Gráfico de receita diária (últimos 30d)
- Card com performance de cada vendedor (foto, nome, vendas hoje/mês, meta atingida)
- **Fonte**: `sales` + `sellers` + `monthly_goals`
- **Hook**: `useSales`, `useSellers`, `useMonthlyGoals`

### 2.2 Funil de Vendas · `/vendas/funil`

Arquivo: `src/pages/FunilVendas.tsx`

- Visualização por etapa: LEAD → MQL → SQL → AGENDADA → REALIZADA → NO_SHOW → VENDA → PERDA
- Contagem por etapa + taxa de conversão entre elas
- Gráfico de barras temporal
- **Fonte**: `leads`
- **Hook**: `useLeads`

### 2.3 Metas de Times · `/vendas/metas-times`

Arquivo: `src/pages/MetasTimes.tsx`

- Lista mensal de metas por vendedor: receita alvo + cursos alvo + dias úteis
- Progresso (bar chart) do quanto já bateu vs meta
- **Fonte**: `monthly_goals` + `sales`
- Só admin pode editar; todos podem ver

### 2.4 Ranking Vendedores · `/vendas/ranking`

Arquivo: `src/pages/Ranking.tsx`

- Top vendedores do mês por: receita, número de vendas, pontos de comissão
- Filtros: mês + tipo de ranking
- **Fonte**: `sales` (agrupado por seller_id) + `sellers`
- **Hook**: `useSales`, `useSellers`

### 2.5 Bônus Comercial · `/vendas/bonus`

Arquivo: `src/pages/Bonus.tsx`

- Calcula bônus por faixa de meta atingida (definidas em `app_settings.bonus_tiers`)
- Ex: 100% da meta → 5% de bônus · 120% → 10% · 150% → 15%
- Usa `sales.commission_points` acumulado
- **Fonte**: `sales` + `monthly_goals` + `app_settings.bonus_tiers`

### 2.6 Avaliação Closers · `/vendas/avaliacao-closers`

Arquivo: `src/pages/AvaliacaoClosers.tsx`

- Métricas qualitativas por closer: taxa de conversão SQL→VENDA, ticket médio, tempo médio até fechar
- Comparativo entre closers
- **Fonte**: `sales` + `leads`

---

## 3. Marketing

### 3.1 Tráfego · `/marketing/trafego`

Arquivo: `src/pages/Marketing.tsx`

- Investimento em mídia por canal (Meta Ads, Google Ads, TikTok Ads, orgânico)
- Custo por lead (CPL), custo por venda (CPA)
- **Fonte**: `traffic_spend` (data + canal + valor) + `sales`
- Só admin cadastra spend

---

## 4. Financeiro (Guru)

Bloco com **7 telas** — integração com DigitalManager Guru. **Todo o módulo é admin-only.**

### 4.1 Dashboard · `/financeiro`

Arquivo: `src/pages/financeiro/Dashboard.tsx`

- KPIs de transações da Guru: vendas hoje, receita período, ticket médio, comparação com período anterior
- Filtro de período: Hoje / 7d / 30d / Mês atual / 90d
- Gráfico de receita diária adaptado ao período
- Card **Status das transações** (paga/pendente/refused/cancelada)
- Card **Top produtos** (5 mais vendidos por receita)
- Card **Últimas vendas** — cada linha navega pro detalhe
- **Fonte**: Guru API (`/transactions` com paginação — até 5 páginas)
- **Hook**: `useGuruTransactionsAll`

### 4.2 Vendas · `/financeiro/vendas`

Arquivo: `src/pages/financeiro/Vendas.tsx`

- Tabela paginada de transações
- Filtros: período (Hoje/7d/30d/90d), status, busca por nome/email/CPF/produto/id
- Clique numa linha → `/financeiro/vendas/:id`
- **Hook**: `useGuruTransactions`

### 4.3 Detalhe da venda · `/financeiro/vendas/:id`

Arquivo: `src/pages/financeiro/VendaDetalhe.tsx`

- Tabs: **Detalhe / Cliente / Afiliações**
- Pagamento (forma, parcelas, valor bruto, líquido)
- Datas (confirmada, ordenada, criada, cancelada)
- Links de checkout/fatura da Guru
- Dados completos do cliente
- Lista de afiliados (se houver comissão)
- `<details>` com JSON cru pra debug
- **Hook**: `useGuruTransaction`

### 4.4 Assinaturas · `/financeiro/assinaturas`

Arquivo: `src/pages/financeiro/Assinaturas.tsx`

- Tabela: cliente, produto, status, cobranças feitas/total, próxima cobrança, valor
- Filtro por status: todas/ativas/canceladas/pausadas/expiradas
- Clique → `/financeiro/assinaturas/:id`
- **Hook**: `useGuruSubscriptions`

### 4.5 Detalhe da assinatura · `/financeiro/assinaturas/:id`

Arquivo: `src/pages/financeiro/AssinaturaDetalhe.tsx`

- Tabs: **Detalhe / Assinante / Faturas / Vendas**
- Configuração: ciclo, forma de pagamento, valor
- Cobranças feitas/totais, próxima
- Datas iniciada/cancelada
- **Faturas**: puxa `/subscriptions/:id/invoices` — cada linha navega pro detalhe da fatura
- **Vendas**: puxa `/transactions?subscription_id=xxx` — clicável pra detalhe
- JSON cru no fim pra debug
- **Hook**: `useGuruSubscription`, `useGuruSubscriptionInvoices`, `useGuruTransactions({subscription_id})`

### 4.6 Detalhe da fatura · `/financeiro/faturas/:id?sub=...`

Arquivo: `src/pages/financeiro/FaturaDetalhe.tsx`

- Cards: Dados, Valores (bruto, imposto, acréscimo, desconto), Datas (início/fim ciclo, cobrada, vencimento, pago), Links (pagamento, boleto)
- Fallback: se `/invoices/:id` retorna 404, busca na lista de invoices da assinatura e filtra
- JSON cru pra debug
- **Hook**: `useGuruInvoice`

### 4.7 Contatos · `/financeiro/contatos`

Arquivo: `src/pages/financeiro/Contatos.tsx`

- Lista paginada de contatos da Guru
- **Busca inteligente**: detecta se é email (tem @), CPF (11 dígitos), CNPJ (14), telefone (10-13), ou nome
- Chips pra forçar tipo: Auto / Nome / Email / CPF / Telefone
- Clique num contato → modal com 3 tabs: **Detalhe / Vendas / Assinaturas**
- Vendas e assinaturas dentro do modal são clicáveis (navegam pra página de detalhe)
- **Hook**: `useGuruContacts`, `useGuruTransactions({contact_id})`, `useGuruSubscriptions({contact_id})`

---

## 5. CS (Customer Success)

Bloco com **5 telas**. Escopo por vendedor (seller vê só próprios alunos, admin/manager vê tudo).

### 5.1 Overview · `/cs/overview`

Arquivo: `src/pages/cs/CSDashboard.tsx`

- KPIs: alunos ativos, novos no mês, churn, NPS médio, tickets abertos
- **Fonte**: `students` + `enrollments` + `cs_tickets` + `nps_responses`

### 5.2 Alunos · `/cs/alunos`

Arquivo: `src/pages/cs/Alunos.tsx`

- Tabela de alunos: nome, email, curso, status (onboarding/ativo/renovado/cancelado), vendedor
- Filtros: status, curso, vendedor
- Clique → `/cs/alunos/:id`
- **Hook**: `useStudents`

### 5.3 Detalhe do aluno · `/cs/alunos/:id`

Arquivo: `src/pages/cs/AlunoDetalhe.tsx`

- Perfil + histórico de matrículas + tickets + notas de CS + steps de onboarding + histórico NPS
- Ações: criar ticket, adicionar nota, marcar step de onboarding
- **Hook**: `useStudent(id)`, `useEnrollments(id)`, `useTickets(studentId)`, `useNotes(id)`, `useOnboardingSteps(id)`, `useNPS(id)`

### 5.4 Tickets · `/cs/tickets`

Arquivo: `src/pages/cs/Tickets.tsx`

- Lista de tickets: aluno, assunto, prioridade, status, dono
- Filtros: status, prioridade, atribuído
- Criar/editar/atribuir/fechar
- **Hook**: `useTickets`

### 5.5 Renovações · `/cs/renovacoes`

Arquivo: `src/pages/cs/Renovacoes.tsx`

- Alunos com matrícula vencendo em N dias
- Alertas pra ação (contatar antes do fim)
- **Fonte**: `enrollments` filtrado por `expires_at`

### 5.6 NPS · `/cs/nps`

Arquivo: `src/pages/cs/NPS.tsx`

- Distribuição de respostas (promotores/passivos/detratores)
- NPS score
- Respostas recentes com comentários
- **Fonte**: `nps_responses`

---

## 6. Workspace

**Escopo pessoal** — cada usuário vê o próprio.

### 6.1 Meu Dia · `/workspace`

Arquivo: `src/pages/workspace/MeuDia.tsx`

- Tarefas do dia (do próprio user)
- Próximas cobranças (se for vendedor)
- Lembretes rápidos

### 6.2 Tarefas · `/workspace/tarefas`

Arquivo: `src/pages/workspace/Tarefas.tsx`

- Kanban: A fazer / Fazendo / Feito
- Cria, edita, atribui, arrasta
- **Fonte**: `workspace_tasks`
- **Hook**: `useTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`

### 6.3 Materiais · `/workspace/materiais`

Arquivo: `src/pages/workspace/Materiais.tsx`

- Biblioteca de arquivos/links compartilhados com o time (playbooks, scripts, PDFs)
- Categorizado, buscável
- **Fonte**: `workspace_materials`
- **Hook**: `useMaterials`

---

## 7. Admin

Bloco com **7 telas**. **Admin-only** (`<ProtectedRoute requireAdmin>`).

### 7.1 Vendedores · `/admin/vendedores`

Arquivo: `src/pages/admin/AdminVendedores.tsx`

- CRUD de vendedores (nome, email, team, cor do avatar, ativo)
- Ligar/desligar
- **Fonte**: `sellers`

### 7.2 Cursos · `/admin/cursos`

Arquivo: `src/pages/admin/AdminCursos.tsx`

- CRUD de produtos (nome + preço)
- **Fonte**: `courses`

### 7.3 Vendas · `/admin/vendas`

Arquivo: `src/pages/admin/AdminVendas.tsx`

- CRUD manual de vendas (pra correções ou vendas offline)
- **Fonte**: `sales`

### 7.4 Leads · `/admin/leads`

Arquivo: `src/pages/admin/AdminLeads.tsx`

- CRUD de leads (com stage e vendedor atribuído)
- **Fonte**: `leads`

### 7.5 Metas · `/admin/metas`

Arquivo: `src/pages/admin/AdminMetas.tsx`

- Definir meta mensal de cada vendedor (receita + cursos + dias úteis)
- **Fonte**: `monthly_goals`

### 7.6 Tráfego · `/admin/trafego`

Arquivo: `src/pages/admin/AdminTrafego.tsx`

- Registrar investimento diário por canal
- **Fonte**: `traffic_spend`

### 7.7 Usuários · `/admin/usuarios`

Arquivo: `src/pages/admin/AdminUsuarios.tsx`

- Lista usuários do sistema (`auth.users` + `profiles`)
- Atribuir role (admin/manager/seller/viewer) e seller vinculado
- Criar novo usuário (envia pra serverless `api/admin/create-user.ts` — usa service_role key)
- **Fonte**: `profiles`

---

## 8. Configurações

Sub-rotas com layout próprio (`ConfiguracoesLayout`). Perfil/Segurança/Aparência/Notificações são pessoais; Empresa/Dados são admin.

### 8.1 Perfil · `/configuracoes/perfil`
Nome, cor do avatar. Salva em `user_settings`.

### 8.2 Segurança · `/configuracoes/seguranca`
Trocar senha, trocar email (fluxo via Supabase Auth).

### 8.3 Aparência · `/configuracoes/aparencia`
Tema (dark/light/system), densidade (compact/comfortable). Salva em `user_settings`.

### 8.4 Notificações · `/configuracoes/notificacoes`
Toggle email + in-app.

### 8.5 Empresa · `/configuracoes/empresa` **(admin)**
Nome, razão social, CNPJ, logo, email de suporte, tiers de bônus, canais de lead, canais de tráfego, times. Salva em `app_settings`.

### 8.6 Dados · `/configuracoes/dados` **(admin)**
Export CSV de cada entidade, wipe do banco (comando destrutivo "LIMPAR TUDO").

### 8.7 Sobre · `/configuracoes/sobre`
Versão, changelog, licenças.

---

## Mapa visual do menu (sidebar)

```
├─ 📊 Receita
├─ 📈 Vendas
│    ├─ Dashboard Times
│    ├─ Funil de Vendas
│    ├─ Metas de Times
│    ├─ Ranking Vendedores
│    ├─ Bônus Comercial
│    └─ Avaliação Closers
├─ 📢 Marketing
│    └─ Tráfego
├─ 💰 Financeiro [admin]
│    ├─ Dashboard
│    ├─ Vendas
│    ├─ Assinaturas
│    └─ Contatos
├─ 🎧 CS
│    ├─ Overview
│    ├─ Alunos
│    ├─ Tickets
│    ├─ Renovações
│    └─ NPS
├─ 📦 Produto (em breve)
├─ 🛡 Admin [admin]
│    ├─ Vendedores
│    ├─ Cursos
│    ├─ Vendas
│    ├─ Leads
│    ├─ Metas
│    ├─ Tráfego
│    └─ Usuários
├─ ⚙ Configurações
└─ 🖥 Workspace
```
