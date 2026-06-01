# Manual de Teste — Lito Academy Vendas

> **Plataforma de Dados** • Sistema interno de gestão comercial, marketing, CS e workspace
> Versão **0.3.0** · Última atualização: maio/2026

---

## 📑 Sumário

1. [Sobre o sistema](#1-sobre-o-sistema)
2. [Acesso](#2-acesso)
3. [Mapa do sistema](#3-mapa-do-sistema)
4. [Como testar — passo a passo](#4-como-testar)
   - [4.1 Login](#41-login)
   - [4.2 Vendas](#42-vendas)
   - [4.3 Marketing](#43-marketing)
   - [4.4 Customer Success (CS)](#44-customer-success-cs)
   - [4.5 Workspace](#45-workspace)
   - [4.6 Administração](#46-administração)
   - [4.7 Configurações](#47-configurações)
5. [Roles e permissões](#5-roles-e-permissões)
6. [Sequência recomendada de teste](#6-sequência-recomendada-de-teste)
7. [Como reportar problemas](#7-como-reportar-problemas)
8. [Limitações conhecidas](#8-limitações-conhecidas)

---

## 1. Sobre o sistema

**Lito Academy Vendas** é uma plataforma interna que centraliza:

| Área | Pra quê |
|------|---------|
| 📊 **Vendas** | Acompanhar funil, metas, ranking de vendedores, bônus comercial |
| 📣 **Marketing** | Tráfego pago, CAC, ROI, CPL/CPM/CPS |
| 💬 **Customer Success** | Alunos, matrículas, renovações, tickets, NPS, onboarding |
| 🏠 **Workspace** | Tarefas atribuídas, biblioteca de materiais de venda |
| ⚙️ **Administração** | Cadastro de vendedores, cursos, leads, vendas, usuários |
| 🔧 **Configurações** | Perfil, segurança, aparência, dados, sobre |

O sistema é **mobile-first responsivo** — funciona no celular e no desktop. Tema dark fixo.

---

## 2. Acesso

### 🌐 URL do sistema
👉 **https://crm-vendas-academy.vercel.app**

### 🔐 Credenciais de teste
Solicite ao administrador (Gabriel) o seguinte:
- **Email** de acesso
- **Senha** temporária (você troca depois)

> **Importante:** o sistema cria automaticamente um perfil **viewer** (visualizador) ao primeiro login. O admin precisa promover sua conta para o role adequado (ex: `admin` para teste completo).

### 📱 Compatibilidade
| Dispositivo | Suporte |
|-------------|---------|
| Desktop (Chrome, Edge, Firefox, Safari) | ✅ Completo |
| Tablet | ✅ Completo |
| Celular (iOS/Android) | ✅ Otimizado — sidebar vira drawer com botão ☰ |

---

## 3. Mapa do sistema

A sidebar (menu lateral) lista todas as áreas. Em mobile, abra com o ícone **☰** no topo.

```
🏠 Receita                    Resumo financeiro
📈 Vendas
   ├ Dashboard Times          KPIs e meta vs realizado
   ├ Funil de Vendas          Conversão e no-shows
   ├ Metas de Times           Atingimento por vendedor
   ├ Ranking Vendedores       Pódio do mês
   ├ Bônus Comercial          Cálculo de comissão
   └ Avaliação Closers        Rubrica qualitativa
📣 Marketing
   └ Tráfego e CAC            Investimento e ROI
💬 CS
   ├ Dashboard                Saúde dos alunos
   ├ Alunos                   Base de clientes
   ├ Tickets                  Fila de suporte
   ├ Renovações               Próximos vencimentos
   └ NPS                      Pesquisa de satisfação
🛡️ Administração (admin only)
   ├ Vendedores               CRUD de vendedores
   ├ Cursos                   Catálogo de produtos
   ├ Registrar Vendas         Histórico + manual
   ├ Leads                    Funil manual
   ├ Metas Mensais            Definir meta por vendedor
   ├ Gastos Tráfego           Investimento por canal
   └ Usuários                 Quem tem acesso
⚙️ Configurações
   ├ Perfil                   Nome, avatar, email
   ├ Segurança                Trocar senha
   ├ Aparência                Tema e densidade
   ├ Notificações             Email e in-app
   ├ Empresa (admin)          Nome, CNPJ, logo
   ├ Dados (admin)            Exportar CSV, limpar
   └ Sobre                    Versão e suporte
🏢 Workspace
   ├ Meu Dia                  Home pessoal
   ├ Tarefas                  To-do atribuído
   └ Materiais                Biblioteca de scripts/FAQs
```

---

## 4. Como testar

### 4.1 Login

**🎯 Caso de teste:**

1. Abra `https://crm-vendas-academy.vercel.app`
2. Insira email e senha fornecidos
3. Clique **Entrar**

✅ **Esperado:** redireciona para `/vendas/dashboard-times` (Dashboard Times)
❌ **Erro comum:** "Email ou senha incorretos" — confirme com o admin

**Teste de erro:**
- Tente senha errada → deve aparecer toast vermelho "Email ou senha incorretos"
- Tente email inexistente → mesma mensagem

---

### 4.2 Vendas

#### 4.2.1 Dashboard Times

Visão geral consolidada do time comercial.

**🎯 O que olhar:**
- 6 KPI cards no topo: Meta do mês / Vendido / Meta acumulada / Cursos / Ticket médio / Projeção
- Barra de progresso da meta mensal
- Gráfico **Vendido vs Meta — acumulado** (linha)
- 5 cards de formas de pagamento (à vista, cartão parcelado, etc)
- Cards individuais por vendedor com ranking

**🎯 Teste:**
1. No header, mude o **mês** (seletor) → todos os KPIs e gráficos devem recalcular
2. No header, mude o **vendedor** (seletor) → vista individual aparece (badge `#X no ranking`)
3. Volte para "Todos os vendedores" → vista consolidada

**⚠️ Empty state:** se você ainda não tem vendedores/metas/vendas cadastrados, aparece o aviso "Nenhum vendedor cadastrado" com botão de atalho — **isso é esperado**.

#### 4.2.2 Funil de Vendas

Conversão das etapas do funil + Top no-shows.

**🎯 O que olhar:**
- 4 KPIs (Leads / MQLs / SQLs / Vendas) com % de conversão
- Gráfico de área "Volume diário de leads"
- Card de **No-Shows** com taxa de resgate (replica visual do design original)
- Abas **Por Vendedor** (tabela) e **Por Etapa** (gráficos)

**🎯 Teste:**
1. Aba **Por Vendedor** → use a busca → digite parte do nome
2. Aba **Por Etapa** → gráficos de funil + barras horizontais aparecem

#### 4.2.3 Metas de Times

Visão consolidada das metas mensais.

**🎯 Teste:**
- Veja "Meta total / Realizado / % Atingimento"
- Tabela por vendedor com Badge colorido de atingimento
- Clique **Editar metas** → vai pra `/admin/metas` (admin only)

#### 4.2.4 Ranking Vendedores

Pódio top 3 com medalhas + tabela completa do 4º em diante.

**🎯 Teste:**
- Pódio mostra Trophy/Medal/Award (ouro/prata/bronze)
- Mude o mês — ordem deve recalcular

#### 4.2.5 Bônus Comercial

Cálculo de bônus por atingimento de meta.

**🎯 Teste:**
1. Veja "Bônus total do time" e "Vendedores acima da meta"
2. **Edite as faixas** (Super Star / Bateu meta / Quase lá / Abaixo) alterando threshold ou %
3. A tabela de bônus por vendedor deve recalcular **em tempo real**

#### 4.2.6 Avaliação Closers

Rubrica qualitativa de avaliação. Hoje exibe placeholder (dados não persistidos ainda).

---

### 4.3 Marketing

#### Tráfego e CAC

**🎯 O que olhar:**
- 6 KPIs: Investimento / Receita / ROI / CAC / CPL / Ticket médio
- Aviso amarelo se CAC > 30% do ticket médio
- Gráfico diário de investimento
- Gráfico por canal (Meta Ads, Google Ads, etc)
- 3 cards: CPL, CPM, CPS

**🎯 Teste:**
1. Mude o mês → métricas recalculam
2. Se não houver dados de tráfego, empty state com botão pra cadastrar

---

### 4.4 Customer Success (CS)

#### 4.4.1 Dashboard CS

KPIs gerais do pós-venda.

**🎯 Teste:**
- 5 KPIs: Total alunos / Ativos / Churn % / Tickets / NPS Score
- Cards de Health Score (Saudáveis / Atenção / Críticos)
- Lista **Alunos em risco** (clicáveis)
- Lista **Renovações em 30 dias** (clicáveis)

#### 4.4.2 Alunos

Lista buscável da base de clientes.

**🎯 Teste:**
1. Clique **Novo aluno**
2. Preencha: Nome completo (obrigatório), CPF (máscara automática), telefone, email, vendedor responsável
3. Salve → aparece na lista
4. Use a busca → digite parte do nome/CPF/email
5. Clique em um aluno → vai pro perfil detalhado

#### 4.4.3 Detalhe do Aluno (aluno individual)

A **página mais densa** do sistema. Tabs:

**🎯 Tab Matrículas**
- Clique **Nova matrícula** → escolha curso, forma de pagamento, status, próxima renovação
- Veja o card com Badge (Ativa/Cancelada/Atrasada/Pausada)

**🎯 Tab Tickets**
- Clique **Novo ticket** → preencha assunto, categoria, prioridade, atribua a vendedor
- Veja na lista com badges coloridos

**🎯 Tab Onboarding**
- 5 etapas pré-definidas: Boas-vindas, Primeiro contato, Acesso, Comunidade, Check-in 30d
- **Clique em cada** pra marcar como concluído (toggle)
- % completo atualiza no topo

**🎯 Tab NPS**
- Escolha nota 0-10 (cores: vermelho 0-6, amarelo 7-8, verde 9-10)
- Adicione comentário (opcional)
- Salve → aparece no histórico abaixo

**🎯 Tab Notas**
- Adicione nota (texto livre, multiline)
- Salve → aparece no histórico com data/hora

**🎯 Health Score (canto superior direito)**
- Score 0-100 colorido (verde/amarelo/vermelho)
- Recalcula automaticamente baseado em: matrículas cancelled/overdue, tickets abertos, último NPS, % onboarding

#### 4.4.4 Tickets

Fila geral de tickets de todos os alunos.

**🎯 Teste:**
- 4 cards-filtro clicáveis: Aberto / Em andamento / Resolvido / Fechado
- Clique em um filtro → lista mostra só daquele status
- Cada item tem Badge de status + prioridade
- Clique no ticket → vai pro perfil do aluno

#### 4.4.5 Renovações

Agrupado por bucket temporal.

**🎯 Teste:**
- 4 KPI cards: Atrasadas / Próx 7d / Próx 30d / Receita potencial
- Seções aparecem **só se houver itens** no bucket
- Cada item mostra dias restantes (vermelho se ≤7d)
- Clique no item → vai pro perfil do aluno

#### 4.4.6 NPS

Dashboard agregado de NPS.

**🎯 Teste:**
- NPS Score grande no topo
- Barra de distribuição Promotores/Passivos/Detratores
- Lista das últimas 50 respostas com nota colorida

---

### 4.5 Workspace

#### 4.5.1 Meu Dia (home pessoal)

A primeira página que o vendedor deve abrir.

**🎯 Teste:**
- Saudação personalizada ("Bom dia, [seu nome]")
- Card com sua meta vs realizado (barra de progresso)
- Reuniões agendadas pra hoje (puxa do funil)
- Suas tarefas pendentes
- Alunos em risco sob sua responsabilidade
- Materiais recentes da biblioteca

> **Admin** vê tarefas e alunos de **todo o time**, vendedor vê só os seus.

#### 4.5.2 Tarefas

Lista de tarefas atribuídas.

**🎯 Teste como admin:**
1. Clique **Nova tarefa**
2. Preencha: Título, Descrição, Atribuir a (vendedor), Prazo, Prioridade, Status
3. Salve → aparece na lista
4. Use os 5 cards-filtro clicáveis (Total / A fazer / Em andamento / Concluídas / Atrasadas)

**🎯 Teste como vendedor:**
- Pode **marcar como concluída** clicando no checkbox
- **Não pode** criar/editar/excluir

#### 4.5.3 Materiais

Biblioteca de scripts, FAQs, vídeos, etc.

**🎯 Teste como admin:**
1. Clique **Novo material**
2. Preencha: Título, Categoria (Script/Apresentação/Vídeo/FAQ/Objeção/Política/Outros), Descrição, Link (opcional), Conteúdo (opcional), Tags
3. Salve → aparece como card colorido
4. **Clique no card** → modal de preview abre com conteúdo completo

**🎯 Filtros:**
- Use a busca → digite título/tag/conteúdo
- Clique nas pílulas de categoria pra filtrar

---

### 4.6 Administração

> **Somente admin** vê esta seção. Vendedor não enxerga.

#### 4.6.1 Vendedores

CRUD da equipe comercial.

**🎯 Teste:**
1. Clique **Novo vendedor**
2. Preencha: Nome completo, Email, Time (Closer Premium/Plus/etc), Cor do avatar, Status
3. Salve → aparece na tabela
4. Edite com ícone 📝 → atualiza
5. Remova com ícone 🗑️ → confirma e remove

#### 4.6.2 Cursos

CRUD do catálogo de produtos.

**🎯 Teste:**
1. Clique **Novo curso**
2. Nome + Preço base
3. Salve

#### 4.6.3 Registrar Vendas

Histórico de vendas + cadastro manual.

**🎯 Pré-requisitos:** Precisa de **pelo menos 1 vendedor E 1 curso** cadastrado.

**🎯 Teste:**
1. Clique **Nova venda**
2. Escolha vendedor, curso, forma de pagamento, parcelas, data
3. Salve → registra
4. Vai aparecer no Dashboard Times, Funil, etc.

#### 4.6.4 Leads

Cadastro manual de leads.

**🎯 Teste:**
1. Clique **Novo lead**
2. Escolha vendedor, origem (Meta Ads/Google Ads/etc), etapa do funil, data
3. Salve

#### 4.6.5 Metas Mensais

Define meta por vendedor por mês.

**🎯 Teste:**
1. Seletor de mês no topo
2. Edite **Meta R$**, **Meta cursos**, **Dias úteis** direto na linha
3. Linha fica destacada de roxo quando alterada
4. Clique **Salvar (X)** no canto superior

#### 4.6.6 Gastos Tráfego

Registro diário de investimento em mídia.

**🎯 Teste:**
1. Clique **Novo gasto**
2. Data, Canal (Meta Ads/Google/TikTok/YouTube/Outros), Valor
3. Salve → aparece em Marketing → Tráfego e CAC

#### 4.6.7 Usuários

Quem tem acesso à plataforma.

**🎯 Teste:**
1. Clique **Criar usuário**
2. Preencha: Nome, Email, Senha (mín 8), Role (Admin/Gestor/Vendedor/Visualizador), Vendedor vinculado (se role=Vendedor)
3. Salve
4. **Caso o email já exista** no Supabase: o sistema **vincula** o user existente (avisa via toast)
5. Na tabela: altere a role de outro usuário no dropdown

---

### 4.7 Configurações

Sistema profissional de configurações pessoais e organizacionais.

#### Pessoal (qualquer usuário)

- **Perfil**: nome completo, cor de avatar, alterar email
- **Segurança**: trocar senha (com indicador de força), logout
- **Aparência**: tema (Dark/Light/System — só Dark ativo) e densidade
- **Notificações**: toggles in-app e email

#### Organização (admin only)

- **Empresa**: nome, razão social, CNPJ (máscara), email de suporte
- **Dados**:
  - Contadores por tabela
  - **Exportar CSV** por entidade (Vendedores, Cursos, Leads, Vendas, Metas, Tráfego)
  - **Exportar tudo** (gera N arquivos CSV)
  - 🚨 **Zona de risco**: Limpar banco — requer digitar `LIMPAR TUDO` para confirmar

#### Sistema (todos)

- **Sobre**: versão, stack técnica, link do repositório, email de suporte

---

## 5. Roles e permissões

| Role | O que pode |
|------|------------|
| **Admin** | Acesso total — gerencia tudo (vendedores, cursos, vendas, leads, metas, usuários, configurações da empresa) |
| **Gestor** (manager) | Lê tudo + gerencia equipe (sem acesso a Admin → Usuários) |
| **Vendedor** (seller) | Vê dashboards, marca tarefas como concluídas, registra notas/NPS/tickets em alunos. **Não acessa Administração** |
| **Visualizador** (viewer) | Somente leitura — sem alterações |

**Estado inicial:** novos usuários sempre começam como **viewer** e precisam ser promovidos pelo admin.

---

## 6. Sequência recomendada de teste

Pra testar o **caminho feliz** completo (1ª vez), siga essa ordem:

### Setup (15 min)
1. **Login** com sua conta
2. **Administração → Vendedores**: cadastre 3-5 vendedores
3. **Administração → Cursos**: cadastre 2-3 cursos com preços diferentes
4. **Administração → Metas Mensais**: defina meta de R$ pra cada vendedor no mês corrente
5. **Administração → Gastos Tráfego**: cadastre 3-5 gastos com canais variados
6. **Administração → Leads**: cadastre 5-10 leads em diferentes etapas (LEAD, MQL, SQL, AGENDADA, VENDA)
7. **Administração → Registrar Vendas**: registre 3-5 vendas (formas de pagamento variadas)

### Validação Vendas (10 min)
8. **Vendas → Dashboard Times**: confira KPIs, gráfico, breakdown de pagamento, cards por vendedor
9. **Vendas → Funil**: veja conversões e tabela por vendedor
10. **Vendas → Ranking**: pódio aparecer correto
11. **Vendas → Bônus**: ajuste faixas, veja cálculo em tempo real
12. **Marketing → Tráfego**: ROI, CAC, gráficos populados

### CS (15 min)
13. **CS → Alunos**: cadastre 3 alunos (nome, CPF, email, vendedor)
14. Em um aluno, clique pra abrir:
    - Aba **Matrículas**: adicione 1-2 matrículas (uma recorrente)
    - Aba **Tickets**: crie 1 ticket
    - Aba **Onboarding**: marque algumas etapas
    - Aba **NPS**: registre nota 9 com comentário
    - Aba **Notas**: adicione uma nota
15. **CS → Dashboard**: KPIs devem refletir
16. **CS → Tickets/Renovações/NPS**: validar agregações

### Workspace (5 min)
17. **Workspace → Tarefas**: crie 2-3 tarefas pra vendedores diferentes
18. **Workspace → Materiais**: cadastre 1 script + 1 FAQ + 1 vídeo (com URL)
19. **Workspace → Meu Dia**: validar que tudo aparece consolidado

### Configurações (5 min)
20. **Configurações → Perfil**: edite seu nome e cor
21. **Configurações → Segurança**: troque a senha
22. **Configurações → Dados**: exporte um CSV de vendas pra validar formato
23. **Configurações → Aparência**: brinque com tema/densidade

### Teste em mobile (5 min)
24. Abra a URL no celular (ou DevTools → modo mobile)
25. Toque no ☰ → sidebar deve abrir como drawer
26. Navegue entre páginas — deve fechar sozinha
27. Tabelas devem ter scroll horizontal

---

## 7. Como reportar problemas

### Antes de reportar
- **Hard refresh** (Ctrl+Shift+R no desktop, ou recarregar puxando pra baixo no celular)
- Tente em **aba anônima** (Ctrl+Shift+N) sem extensões — pra descartar conflito

### Quando reportar — tenha à mão
1. **URL** da página onde ocorreu (copie da barra de endereço)
2. **Passo a passo** pra reproduzir (3-5 passos)
3. **O que esperava acontecer**
4. **O que aconteceu de fato**
5. **Screenshot** da tela
6. **Console do navegador**: F12 → aba **Console** → screenshot de erros vermelhos
7. **Network** se for erro de carregamento: F12 → aba **Network** → recarregue → screenshot

### Onde reportar
Envie pelo canal combinado com o gestor (WhatsApp, email ou issue no GitHub).

### Classificação sugerida
| Severidade | Exemplo |
|-----------|---------|
| 🔴 **Crítico** | Não consigo logar / página em branco / dados sumiram |
| 🟠 **Alto** | Botão não funciona / dado errado em KPI importante |
| 🟡 **Médio** | Layout quebrado em mobile / textos cortados |
| 🟢 **Baixo** | Sugestão de melhoria / typo |

---

## 8. Limitações conhecidas

Pendências mapeadas (não são bugs):

### Visuais / UX
- **Avaliação de Closers**: placeholder visual — sem persistência ainda
- **Tela de Login**: pode usar logo SVG (já está no projeto)
- **Tema Light**: marcador "Em breve" — só Dark funciona

### Funcionais
- **Edição de tickets em CS**: hoje só cria/visualiza — edição inline planejada
- **Excluir gasto/lead/venda em massa**: não tem ação em batch
- **Notificações in-app real**: toggles existem mas notificações não disparam ainda
- **Renovação automática de cobrança**: status é manual (admin atualiza)
- **Integração com gateway de pagamento**: não há (vendas são manuais)

### Performance (esperado pelo design)
- Lista de Alunos / Vendas / Leads exibe **até 100 itens** por padrão (paginação não está implementada — não vire problema até ~500 registros por tabela)
- React Query cacheia 5 min — se cadastrar e não ver, dá **F5**

---

## 📞 Contato

- **Administrador**: Gabriel (`gabriel@avioesemusicas.com`)
- **Repositório**: [github.com/EuGabis/crm_vendas_academy](https://github.com/EuGabis/crm_vendas_academy)
- **URL produção**: `crm-vendas-academy.vercel.app`

---

*Documentação gerada em maio/2026 — versão 0.3.0*
