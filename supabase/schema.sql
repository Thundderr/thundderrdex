-- ThundderrDex cloud-sync schema. Paste into the Supabase SQL editor.
-- One row per (user, synced store). updated_at is client-supplied so
-- last-write-wins compares a single clock domain (the devices' clocks).

create table public.user_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  -- 'training' is reserved for the Training Dojo's SRS progress. The store is
  -- local-only today; to turn on cloud sync, add a SYNCED_STORES entry for it
  -- (see src/lib/sync/storeRegistry.ts) and apply this constraint update.
  store_key  text        not null check (store_key in ('caught', 'modules', 'generation', 'training')),
  payload    jsonb       not null,
  version    integer     not null default 0,          -- zustand persist schema version
  updated_at timestamptz not null,                    -- client-supplied last-modified time
  primary key (user_id, store_key),
  constraint payload_size_limit check (pg_column_size(payload) < 1048576)
);

alter table public.user_state enable row level security;

create policy "select own state" on public.user_state
  for select using (auth.uid() = user_id);
create policy "insert own state" on public.user_state
  for insert with check (auth.uid() = user_id);
create policy "update own state" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own state" on public.user_state
  for delete using (auth.uid() = user_id);

-- Conditional upsert: only writes if the incoming change is newer.
-- Returns the stored updated_at; NULL means the write was rejected because
-- the remote row is newer -> the caller should download instead.
create or replace function public.save_user_state(
  p_store_key  text,
  p_payload    jsonb,
  p_version    integer,
  p_updated_at timestamptz
) returns timestamptz
language sql
security invoker
as $$
  insert into public.user_state (user_id, store_key, payload, version, updated_at)
  values (auth.uid(), p_store_key, p_payload, p_version, p_updated_at)
  on conflict (user_id, store_key) do update
    set payload = excluded.payload,
        version = excluded.version,
        updated_at = excluded.updated_at
    where excluded.updated_at > user_state.updated_at
  returning updated_at;
$$;
