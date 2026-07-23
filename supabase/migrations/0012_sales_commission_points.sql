-- ============================================================================
-- Adiciona coluna commission_points em public.sales
-- Usada pelo Ranking Vendedores / Bonus Comercial e vem da coluna J
-- da planilha META VENDEDORES importada em batch.
--
-- Idempotente: add column if not exists.
-- ============================================================================

alter table public.sales
  add column if not exists commission_points numeric(10, 2);

comment on column public.sales.commission_points is
  'Pontos de comissao para ranking/bonus do vendedor. Pode ser nulo (venda sem pontuacao, ex: venda organica do SITE).';

create index if not exists idx_sales_commission_points
  on public.sales(seller_id, commission_points)
  where commission_points is not null;

do $$ begin
  raise notice 'Coluna commission_points criada. Roda o script de import agora.';
end $$;
