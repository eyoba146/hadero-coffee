-- Run this once in Supabase SQL Editor.
-- The service role key is used only by the Node server; never expose it in the browser.
create table if not exists public.app_state (
  id smallint primary key check (id = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create or replace function public.touch_app_state_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at
before update on public.app_state
for each row execute function public.touch_app_state_updated_at();
