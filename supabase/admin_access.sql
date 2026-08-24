-- Admin access source of truth for Supabase RLS policies.
-- Run this in Supabase SQL Editor, then add your real admin login email below.

create table if not exists public.admin_users (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin_email()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and is_active = true
  );
$$;

revoke all on function public.is_admin_email() from public;
grant execute on function public.is_admin_email() to anon, authenticated;

-- Replace this email with the email you use to sign in as admin.
-- You can add more admins by repeating this insert with another email.
insert into public.admin_users (email, is_active)
values ('your-admin-login@example.com', true)
on conflict (email) do update
set is_active = excluded.is_active;
