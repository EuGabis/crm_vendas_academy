-- ============================================================================
-- Workspace: tarefas + biblioteca de materiais
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('baixa', 'media', 'alta', 'urgente');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('pending', 'in_progress', 'done', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'material_category') then
    create type material_category as enum (
      'script', 'apresentacao', 'video', 'faq', 'objecao', 'politica', 'outros'
    );
  end if;
end$$;

-- Tarefas
create table if not exists public.workspace_tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  assigned_to uuid references public.sellers(id) on delete set null,
  priority task_priority not null default 'media',
  status task_status not null default 'pending',
  due_date date,
  related_student_id uuid references public.students(id) on delete set null,
  related_lead_id uuid references public.leads(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_tasks_assigned on public.workspace_tasks(assigned_to);
create index if not exists idx_tasks_status on public.workspace_tasks(status);
create index if not exists idx_tasks_due on public.workspace_tasks(due_date);

-- Materiais
create table if not exists public.workspace_materials (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category material_category not null default 'outros',
  url text,
  body text, -- markdown
  tags text[] not null default array[]::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_materials_category on public.workspace_materials(category);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.workspace_tasks enable row level security;
alter table public.workspace_materials enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['workspace_tasks','workspace_materials']) loop
    execute format('drop policy if exists "authenticated read %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "admin insert %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "admin delete %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "auth update %1$s" on public.%1$s;', t);
  end loop;
end$$;

-- Read: autenticado
create policy "authenticated read workspace_tasks" on public.workspace_tasks
  for select to authenticated using (true);
create policy "authenticated read workspace_materials" on public.workspace_materials
  for select to authenticated using (true);

-- Tasks: admin cria/deleta; autenticado pode atualizar (marcar como concluida)
create policy "admin insert workspace_tasks" on public.workspace_tasks
  for insert to authenticated with check (public.is_admin());
create policy "admin delete workspace_tasks" on public.workspace_tasks
  for delete to authenticated using (public.is_admin());
create policy "auth update workspace_tasks" on public.workspace_tasks
  for update to authenticated using (true) with check (true);

-- Materiais: admin only pra escrita
create policy "admin write workspace_materials" on public.workspace_materials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
