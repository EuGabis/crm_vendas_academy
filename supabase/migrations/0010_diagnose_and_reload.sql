-- ============================================================================
-- DIAGNOSTICO: descobrir por que ainda aparece "public.sellers does not exist"
-- Roda tudo e mostra o que ainda referencia os nomes antigos.
-- Ao final, forca reload do schema no PostgREST.
--
-- Aplicar via Supabase SQL Editor. Os resultados aparecem no painel "Results".
-- Rode CADA bloco separadamente pra ver o resultado (Supabase agrupa em 1 output).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabelas atuais no schema public — confirma se o rename rolou
-- ----------------------------------------------------------------------------
select 'TABELAS' as tipo, table_name as nome
from information_schema.tables
where table_schema = 'public'
  and (
    table_name in (
      'sellers','courses','monthly_goals','leads','sales','traffic_spend','profiles',
      'app_settings','user_settings','students','enrollments','cs_tickets','cs_notes',
      'nps_responses','onboarding_steps','workspace_tasks','workspace_materials'
    )
    or table_name like 'juliana_%'
  )
order by table_name;

-- ----------------------------------------------------------------------------
-- 2) Views que ainda referenciam nomes antigos
-- ----------------------------------------------------------------------------
select 'VIEW' as tipo, viewname as nome, substring(definition, 1, 300) as trecho
from pg_views
where schemaname = 'public'
  and (
    definition ilike '%from public.sellers%'
    or definition ilike '%from public.profiles%'
    or definition ilike '%from public.leads%'
    or definition ilike '%from public.sales%'
    or definition ilike '%from sellers%'
    or definition ilike '%from profiles%'
  );

-- ----------------------------------------------------------------------------
-- 3) Funcoes que ainda referenciam nomes antigos (fora as juliana_*)
-- ----------------------------------------------------------------------------
select 'FUNCTION' as tipo, proname as nome, substring(prosrc, 1, 300) as trecho
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    prosrc ilike '%public.sellers%'
    or prosrc ilike '%public.profiles%'
    or prosrc ilike '%public.leads%'
    or prosrc ilike '%public.sales%'
    or prosrc ilike '%from sellers%'
    or prosrc ilike '%from profiles%'
  )
  and prosrc not ilike '%juliana_%';

-- ----------------------------------------------------------------------------
-- 4) Politicas que ainda referenciam nomes antigos
-- ----------------------------------------------------------------------------
select 'POLICY' as tipo, polname as nome, substring(pg_get_expr(polqual, polrelid), 1, 300) as trecho
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and (
    pg_get_expr(polqual, polrelid) ilike '%public.sellers%'
    or pg_get_expr(polqual, polrelid) ilike '%public.profiles%'
    or pg_get_expr(polqual, polrelid) ilike '%public.leads%'
    or pg_get_expr(polqual, polrelid) ilike '%from sellers%'
    or pg_get_expr(polqual, polrelid) ilike '%from profiles%'
  );

-- ----------------------------------------------------------------------------
-- 5) FORCA RELOAD do schema no PostgREST (equivalente a reiniciar)
-- Isso resolve se o PostgREST estava servindo cache do schema antigo.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- 6) Confirma
-- ----------------------------------------------------------------------------
do $$
declare
  n_tabelas int;
begin
  select count(*) into n_tabelas
  from information_schema.tables
  where table_schema = 'public' and table_name like 'juliana_%';
  raise notice 'Total de tabelas juliana_*: %', n_tabelas;
  if n_tabelas < 17 then
    raise notice 'ATENCAO: esperado 17 tabelas juliana_*, mas so achei %. Roda 0008 de novo.', n_tabelas;
  else
    raise notice 'OK — todas as 17 tabelas juliana_* estao no banco.';
  end if;
  raise notice 'Reload do PostgREST solicitado. Aguarda 3s e testa o sistema.';
end $$;
