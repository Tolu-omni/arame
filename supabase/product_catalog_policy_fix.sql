-- Product catalog admin policy fix only.
-- Run this if the admin page opens but product price edits/adds/deletes do not save.
-- This does not insert or overwrite product rows.

alter table public.products enable row level security;

drop policy if exists "admins can view all products" on public.products;
create policy "admins can view all products"
  on public.products for select
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "admins can insert products" on public.products;
create policy "admins can insert products"
  on public.products for insert
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "admins can update products" on public.products;
create policy "admins can update products"
  on public.products for update
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "admins can delete products" on public.products;
create policy "admins can delete products"
  on public.products for delete
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));
