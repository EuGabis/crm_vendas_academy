-- ============================================================================
-- RLS: escopo de leitura por vendedor
-- Aplicar APÓS 0001..0005, via Supabase Dashboard → SQL Editor → RUN.
--
-- Regra:
--   admin / manager  -> leem TUDO (dashboards consolidados, ranking)
--   seller           -> lê apenas as próprias linhas (leads/vendas/alunos...)
--   viewer (sem seller_id) -> não lê dados operacionais
--
-- Dados de referência/compartilhados (sellers, courses, materiais, app_settings)
-- continuam legíveis por qualquer autenticado — são catálogos, não dados de venda.
--
-- IMPORTANTE: escritas NÃO mudam aqui (seguem como em 0001..0005). Esta migration
-- trata só de SELECT. Reverter = restaurar as policies "authenticated read ...".
-- ============================================================================

-- Helper: true se o user atual é admin OU manager (enxerga tudo)
create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('admin', 'manager'),
    false
  );
$func$;

-- ============================================================================
-- Núcleo de vendas — escopo por seller_id
-- ============================================================================
drop policy if exists "authenticated read leads" on public.leads;
create policy "scoped read leads" on public.leads
  for select to authenticated
  using (public.is_admin_or_manager() or seller_id = public.auth_seller_id());

drop policy if exists "authenticated read sales" on public.sales;
create policy "scoped read sales" on public.sales
  for select to authenticated
  using (public.is_admin_or_manager() or seller_id = public.auth_seller_id());

drop policy if exists "authenticated read monthly_goals" on public.monthly_goals;
create policy "scoped read monthly_goals" on public.monthly_goals
  for select to authenticated
  using (public.is_admin_or_manager() or seller_id = public.auth_seller_id());

-- traffic_spend é gasto de mídia do time (não tem dono): só admin/manager
drop policy if exists "authenticated read traffic_spend" on public.traffic_spend;
create policy "staff read traffic_spend" on public.traffic_spend
  for select to authenticated
  using (public.is_admin_or_manager());

-- ============================================================================
-- Customer Success — escopo via vendedor dono do aluno
-- ============================================================================
drop policy if exists "authenticated read students" on public.students;
create policy "scoped read students" on public.students
  for select to authenticated
  using (public.is_admin_or_manager() or seller_id = public.auth_seller_id());

drop policy if exists "authenticated read enrollments" on public.enrollments;
create policy "scoped read enrollments" on public.enrollments
  for select to authenticated
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.students st
      where st.id = enrollments.student_id
        and st.seller_id = public.auth_seller_id()
    )
  );

drop policy if exists "authenticated read cs_tickets" on public.cs_tickets;
create policy "scoped read cs_tickets" on public.cs_tickets
  for select to authenticated
  using (
    public.is_admin_or_manager()
    or assigned_to = public.auth_seller_id()
    or exists (
      select 1 from public.students st
      where st.id = cs_tickets.student_id
        and st.seller_id = public.auth_seller_id()
    )
  );

drop policy if exists "authenticated read cs_notes" on public.cs_notes;
create policy "scoped read cs_notes" on public.cs_notes
  for select to authenticated
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.students st
      where st.id = cs_notes.student_id
        and st.seller_id = public.auth_seller_id()
    )
  );

drop policy if exists "authenticated read nps_responses" on public.nps_responses;
create policy "scoped read nps_responses" on public.nps_responses
  for select to authenticated
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.students st
      where st.id = nps_responses.student_id
        and st.seller_id = public.auth_seller_id()
    )
  );

drop policy if exists "authenticated read onboarding_steps" on public.onboarding_steps;
create policy "scoped read onboarding_steps" on public.onboarding_steps
  for select to authenticated
  using (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.students st
      where st.id = onboarding_steps.student_id
        and st.seller_id = public.auth_seller_id()
    )
  );

-- ============================================================================
-- Workspace — tarefas escopadas; materiais seguem compartilhados
-- ============================================================================
drop policy if exists "authenticated read workspace_tasks" on public.workspace_tasks;
create policy "scoped read workspace_tasks" on public.workspace_tasks
  for select to authenticated
  using (
    public.is_admin_or_manager()
    or assigned_to = public.auth_seller_id()
    or created_by = auth.uid()
  );

-- ============================================================================
-- Defesa em profundidade: a view de receita passa a respeitar o RLS de quem
-- consulta (em vez dos privilégios do dono da view). Requer Postgres 15+.
-- ============================================================================
alter view public.v_monthly_revenue set (security_invoker = on);

-- ============================================================================
-- Mantidos abertos a qualquer autenticado (catálogo / referência):
--   sellers, courses, workspace_materials, app_settings
-- Não há mudança de policy para eles — são dados não sensíveis usados em toda a UI
-- (nomes de vendedores, lista de cursos, biblioteca de materiais, configs de form).
-- ============================================================================
