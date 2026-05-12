-- ============================================================================
-- Settings: configurações globais (admin) e por usuário
-- ============================================================================

-- App settings: key/value global, escrita só admin, leitura autenticada
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "authenticated read app_settings" on public.app_settings;
drop policy if exists "admin write app_settings" on public.app_settings;

create policy "authenticated read app_settings" on public.app_settings
  for select to authenticated using (true);

create policy "admin write app_settings" on public.app_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- User settings: preferências pessoais (tema, notificações)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',                    -- 'dark' | 'light' | 'system'
  density text not null default 'comfortable',           -- 'comfortable' | 'compact'
  notify_email boolean not null default true,
  notify_in_app boolean not null default true,
  full_name text,
  avatar_color text default '#8b5cf6',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "self read user_settings" on public.user_settings;
drop policy if exists "self write user_settings" on public.user_settings;

create policy "self read user_settings" on public.user_settings
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "self write user_settings" on public.user_settings
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Trigger: ao criar user, cria user_settings padrão
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$func$;

drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_settings();

-- Backfill: cria user_settings pra users que já existem
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Pre-popular app_settings com defaults
insert into public.app_settings (key, value) values
  ('company', '{"name": "Lito Academy", "legal_name": "", "cnpj": "", "logo_url": "/lito-full.png", "support_email": ""}'::jsonb),
  ('branding', '{"primary_color": "#8b5cf6", "show_logo_login": true}'::jsonb),
  ('bonus_tiers', '[
    {"threshold": 1.2, "bonus_pct": 0.05, "label": "Super Star"},
    {"threshold": 1.0, "bonus_pct": 0.03, "label": "Bateu meta"},
    {"threshold": 0.8, "bonus_pct": 0.015, "label": "Quase lá"},
    {"threshold": 0,   "bonus_pct": 0,     "label": "Abaixo"}
  ]'::jsonb),
  ('lead_sources', '["Meta Ads","Google Ads","Orgânico","Indicação","YouTube","Webinar","Manual"]'::jsonb),
  ('traffic_channels', '["Meta Ads","Google Ads","TikTok Ads","YouTube Ads","Outros"]'::jsonb),
  ('seller_teams', '["Closer Premium","Closer Plus","Closer Trainee","SDR"]'::jsonb)
on conflict (key) do nothing;
