-- Product image storage only.
-- Run this before using the admin product image file picker.
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

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "admins can upload product images" on storage.objects;
create policy "admins can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin_email());

drop policy if exists "admins can update product images" on storage.objects;
create policy "admins can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin_email())
  with check (bucket_id = 'product-images' and public.is_admin_email());

drop policy if exists "admins can delete product images" on storage.objects;
create policy "admins can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin_email());
