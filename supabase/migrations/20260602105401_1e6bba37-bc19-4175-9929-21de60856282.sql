-- Atomic credit consumption to fix QUOTA_RACE_CONDITION
create or replace function public.consume_credit(
  p_user_id uuid,
  p_n integer,
  p_limit integer,
  p_month text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into public.usage_counters(user_id, month, used, updated_at)
  values (p_user_id, p_month, p_n, now())
  on conflict (user_id, month) do update
    set used = public.usage_counters.used + p_n,
        updated_at = now()
    where public.usage_counters.used + p_n <= p_limit
  returning used into v_used;

  if v_used is null then
    -- Either insert violated limit (only possible if p_n > p_limit) or
    -- the on-conflict WHERE prevented the update because the user is over.
    raise exception 'QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;

  return v_used;
end;
$$;

revoke all on function public.consume_credit(uuid, integer, integer, text) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid, integer, integer, text) to service_role;