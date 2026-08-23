-- Product image storage only.
-- Run this before using the admin product image file picker.
-- This does not insert or overwrite product rows.

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
  with check (bucket_id = 'product-images' and lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "admins can update product images" on storage.objects;
create policy "admins can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'))
  with check (bucket_id = 'product-images' and lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "admins can delete product images" on storage.objects;
create policy "admins can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));
