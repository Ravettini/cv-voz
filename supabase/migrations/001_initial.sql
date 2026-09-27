-- CV Voz · esquema inicial
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'paused', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  sequence integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists interview_segments_session_seq
  on public.interview_transcript_segments(session_id, sequence);

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_session_id uuid references public.interview_sessions(id) on delete set null,
  structured_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_profiles_user_updated
  on public.candidate_profiles(user_id, updated_at desc);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_profile_id uuid not null references public.candidate_profiles(id) on delete cascade,
  name text not null,
  target_role text,
  template_id text not null check (template_id in ('ats', 'professional', 'modern', 'executive')),
  photo_url text,
  current_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  version integer not null,
  content jsonb not null,
  ats_score jsonb not null,
  created_at timestamptz not null default now(),
  unique(resume_id, version)
);

alter table public.profiles enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_transcript_segments enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;

create policy "profiles_own" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "interviews_own" on public.interview_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "segments_own" on public.interview_transcript_segments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "candidate_profiles_own" on public.candidate_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "resumes_own" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "resume_versions_own" on public.resume_versions
  for all using (
    exists (
      select 1 from public.resumes r
      where r.id = resume_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.resumes r
      where r.id = resume_id and r.user_id = auth.uid()
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "photo_read_public"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "photo_upload_own"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "photo_update_own"
  on storage.objects for update
  using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "photo_delete_own"
  on storage.objects for delete
  using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
