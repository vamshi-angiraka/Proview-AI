
-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  career_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Test attempts
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  total_questions int not null,
  correct_answers int not null,
  score_percent numeric not null,
  duration_seconds int not null,
  passed boolean not null default false,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.test_attempts enable row level security;

create policy "Users can view own attempts" on public.test_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own attempts" on public.test_attempts for insert with check (auth.uid() = user_id);

create index test_attempts_user_idx on public.test_attempts(user_id, created_at desc);
