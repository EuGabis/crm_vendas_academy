-- ============================================================================
-- Customer Success: alunos, matriculas, tickets, notas, NPS, onboarding
-- ============================================================================

-- Alunos
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  cpf text unique,
  email text,
  phone text,
  seller_id uuid references public.sellers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_seller on public.students(seller_id);
create index if not exists idx_students_cpf on public.students(cpf);

-- Matriculas
create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete set null,
  payment_method payment_method not null,
  is_recurring boolean not null default false,
  status text not null default 'active' check (status in ('active','cancelled','overdue','paused')),
  next_renewal_at date,
  enrolled_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text
);

create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_renewal on public.enrollments(next_renewal_at);
create index if not exists idx_enrollments_status on public.enrollments(status);

-- Tickets
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_category') then
    create type ticket_category as enum (
      'duvida_conteudo', 'duvida_tecnica', 'financeiro', 'sugestao', 'reclamacao', 'outros'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('aberto', 'em_andamento', 'resolvido', 'fechado');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_priority') then
    create type ticket_priority as enum ('baixa', 'media', 'alta', 'urgente');
  end if;
end$$;

create table if not exists public.cs_tickets (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  category ticket_category not null default 'outros',
  subject text not null,
  body text,
  status ticket_status not null default 'aberto',
  priority ticket_priority not null default 'media',
  assigned_to uuid references public.sellers(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists idx_tickets_student on public.cs_tickets(student_id);
create index if not exists idx_tickets_status on public.cs_tickets(status);
create index if not exists idx_tickets_assigned on public.cs_tickets(assigned_to);

-- Notas (historico de interacoes)
create table if not exists public.cs_notes (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  body text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_student on public.cs_notes(student_id);

-- NPS
create table if not exists public.nps_responses (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  score int not null check (score >= 0 and score <= 10),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_nps_student on public.nps_responses(student_id);
create index if not exists idx_nps_created on public.nps_responses(created_at);

-- Onboarding (steps configurable; default 5 steps)
create table if not exists public.onboarding_steps (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  step_key text not null,
  completed_at timestamptz,
  unique (student_id, step_key)
);

create index if not exists idx_onboarding_student on public.onboarding_steps(student_id);

-- ============================================================================
-- RLS — mesmo padrao (autenticado le, admin escreve)
-- ============================================================================
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.cs_tickets enable row level security;
alter table public.cs_notes enable row level security;
alter table public.nps_responses enable row level security;
alter table public.onboarding_steps enable row level security;

-- Drop policies antigas se existirem (idempotente)
do $$
declare t text;
begin
  for t in select unnest(array[
    'students','enrollments','cs_tickets','cs_notes','nps_responses','onboarding_steps'
  ]) loop
    execute format('drop policy if exists "authenticated read %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "admin insert %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "admin update %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "admin delete %1$s" on public.%1$s;', t);
  end loop;
end$$;

-- Read: autenticado
create policy "authenticated read students" on public.students for select to authenticated using (true);
create policy "authenticated read enrollments" on public.enrollments for select to authenticated using (true);
create policy "authenticated read cs_tickets" on public.cs_tickets for select to authenticated using (true);
create policy "authenticated read cs_notes" on public.cs_notes for select to authenticated using (true);
create policy "authenticated read nps_responses" on public.nps_responses for select to authenticated using (true);
create policy "authenticated read onboarding_steps" on public.onboarding_steps for select to authenticated using (true);

-- Write: admin OR autenticado pra notas/tickets (CS no dia-a-dia)
-- Students/enrollments: admin only
create policy "admin write students" on public.students
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write enrollments" on public.enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tickets / notes / nps / onboarding: qualquer authenticated pode CRUD
-- (no dia-a-dia o vendedor abre ticket, escreve nota, etc.)
create policy "auth write cs_tickets" on public.cs_tickets
  for all to authenticated using (true) with check (true);
create policy "auth write cs_notes" on public.cs_notes
  for all to authenticated using (true) with check (true);
create policy "auth write nps_responses" on public.nps_responses
  for all to authenticated using (true) with check (true);
create policy "auth write onboarding_steps" on public.onboarding_steps
  for all to authenticated using (true) with check (true);
