-- Enable extensions used for UUID generation.
create extension if not exists "pgcrypto";

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  rope_position integer not null default 50 check (rope_position between 0 and 100),
  step_size integer not null default 5 check (step_size between 1 and 20),
  winner smallint check (winner in (1, 2)),
  player1_token text not null,
  player2_token text,
  current_problem jsonb not null,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_sessions_status on public.game_sessions(status);

create or replace function public.touch_game_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_game_sessions_updated_at on public.game_sessions;
create trigger trg_touch_game_sessions_updated_at
before update on public.game_sessions
for each row
execute function public.touch_game_sessions_updated_at();

create or replace function public.generate_math_problem()
returns jsonb
language plpgsql
as $$
declare
  op text;
  a integer;
  b integer;
  nonce text;
begin
  op := (array['+','-','*'])[1 + floor(random() * 3)::int];

  if op = '*' then
    a := 2 + floor(random() * 11)::int;
    b := 2 + floor(random() * 11)::int;
  elsif op = '-' then
    a := 10 + floor(random() * 90)::int;
    b := floor(random() * (a + 1))::int;
  else
    a := 1 + floor(random() * 99)::int;
    b := 1 + floor(random() * 99)::int;
  end if;

  nonce := encode(gen_random_bytes(8), 'hex');

  return jsonb_build_object(
    'a', a,
    'b', b,
    'op', op,
    'text', concat(a::text, ' ', op, ' ', b::text),
    'nonce', nonce
  );
end;
$$;

create or replace function public.eval_math_problem(problem jsonb)
returns integer
language plpgsql
immutable
as $$
declare
  a integer;
  b integer;
  op text;
begin
  a := (problem->>'a')::integer;
  b := (problem->>'b')::integer;
  op := problem->>'op';

  if op = '+' then
    return a + b;
  elsif op = '-' then
    return a - b;
  elsif op = '*' then
    return a * b;
  end if;

  raise exception 'Unsupported operator: %', op;
end;
$$;

create type public.answer_result as (
  accepted boolean,
  reason text,
  session public.game_sessions
);

create or replace function public.attempt_answer(
  p_session_id uuid,
  p_player_token text,
  p_answer integer,
  p_nonce text
)
returns public.answer_result
language plpgsql
as $$
declare
  s public.game_sessions%rowtype;
  expected integer;
  delta integer;
  next_problem jsonb;
  out_row public.answer_result;
begin
  select * into s
  from public.game_sessions
  where id = p_session_id
  for update;

  if not found then
    out_row.accepted := false;
    out_row.reason := 'session_not_found';
    return out_row;
  end if;

  if s.status <> 'active' then
    out_row.accepted := false;
    out_row.reason := 'session_not_active';
    out_row.session := s;
    return out_row;
  end if;

  if p_player_token <> s.player1_token and p_player_token <> coalesce(s.player2_token, '') then
    out_row.accepted := false;
    out_row.reason := 'unauthorized_player';
    out_row.session := s;
    return out_row;
  end if;

  if (s.current_problem->>'nonce') <> p_nonce then
    out_row.accepted := false;
    out_row.reason := 'stale_problem';
    out_row.session := s;
    return out_row;
  end if;

  expected := public.eval_math_problem(s.current_problem);
  if expected <> p_answer then
    out_row.accepted := false;
    out_row.reason := 'wrong_answer';
    out_row.session := s;
    return out_row;
  end if;

  if p_player_token = s.player1_token then
    delta := s.step_size;
  else
    delta := -s.step_size;
  end if;

  s.rope_position := least(100, greatest(0, s.rope_position + delta));
  s.version := s.version + 1;

  if s.rope_position = 100 then
    s.status := 'finished';
    s.winner := 1;
  elsif s.rope_position = 0 then
    s.status := 'finished';
    s.winner := 2;
  else
    s.winner := null;
  end if;

  next_problem := public.generate_math_problem();
  s.current_problem := next_problem;

  update public.game_sessions
  set
    rope_position = s.rope_position,
    version = s.version,
    status = s.status,
    winner = s.winner,
    current_problem = s.current_problem
  where id = s.id
  returning * into s;

  out_row.accepted := true;
  out_row.reason := 'ok';
  out_row.session := s;
  return out_row;
end;
$$;

create or replace function public.reset_match(
  p_session_id uuid,
  p_player_token text
)
returns public.game_sessions
language plpgsql
as $$
declare
  s public.game_sessions%rowtype;
begin
  select * into s
  from public.game_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if p_player_token <> s.player1_token and p_player_token <> coalesce(s.player2_token, '') then
    raise exception 'Unauthorized player';
  end if;

  s.rope_position := 50;
  s.winner := null;
  s.version := s.version + 1;
  s.current_problem := public.generate_math_problem();
  s.status := case when s.player2_token is null then 'waiting' else 'active' end;

  update public.game_sessions
  set
    rope_position = s.rope_position,
    winner = s.winner,
    version = s.version,
    status = s.status,
    current_problem = s.current_problem
  where id = s.id
  returning * into s;

  return s;
end;
$$;

alter table public.game_sessions replica identity full;

-- Demo-friendly defaults: APIs use service-role credentials, and clients subscribe to updates.
alter table public.game_sessions disable row level security;
