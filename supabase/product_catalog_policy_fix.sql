-- Product catalog admin policy fix only.
-- Run this if the admin page opens but product price edits/adds/deletes do not save.
-- This does not insert or overwrite product rows.

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

alter table public.products enable row level security;

drop policy if exists "admins can view all products" on public.products;
create policy "admins can view all products"
  on public.products for select
  using (public.is_admin_email());

drop policy if exists "admins can insert products" on public.products;
create policy "admins can insert products"
  on public.products for insert
  with check (public.is_admin_email());

drop policy if exists "admins can update products" on public.products;
create policy "admins can update products"
  on public.products for update
  using (public.is_admin_email())
  with check (public.is_admin_email());

drop policy if exists "admins can delete products" on public.products;
create policy "admins can delete products"
  on public.products for delete
  using (public.is_admin_email());
