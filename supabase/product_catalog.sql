-- Product catalog only.
-- Run this in Supabase SQL Editor when you only need shop products/admin product CRUD.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price numeric not null,
  image_path text not null,
  description text,
  category text not null,
  sizes text[] default array['100ml', '200ml'],
  category_tags text[] default '{}',
  concentration_tags text[] default '{}',
  scent_tags text[] default '{}',
  scent_profile_tags text[] default '{}',
  size_tags text[] default '{}',
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;

drop policy if exists "active products are public" on public.products;
create policy "active products are public"
  on public.products for select
  using (is_active = true);

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

insert into public.products (
  slug,
  name,
  price,
  image_path,
  description,
  category,
  sizes,
  category_tags,
  concentration_tags,
  scent_tags,
  scent_profile_tags,
  size_tags,
  sort_order
)
values
  (
    'fresh-fruity-mist',
    'Fresh Fruity Mist',
    75,
    '/images/shop/fresh-fruity-mist.jpg',
    'A vibrant, frosted glass spray bottle with a clean white cap, filled with a light peach-colored, fresh fruity mist for daily wear.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Eau de Toilette'],
    array['Jasmine'],
    array['Rose'],
    array['100ml', '200ml'],
    1
  ),
  (
    'exotic-oriental-blend',
    'Exotic Oriental Blend',
    165,
    '/images/shop/exotic-oriental-blend.jpg',
    'A richer evening scent layered with warmth, depth and a slightly sweet dry down.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Eau de Parfum'],
    array['Rosehip', 'Vanilla'],
    array['Rose'],
    array['100ml', '200ml'],
    2
  ),
  (
    'floral-eau-de-parfum',
    'Floral Eau de Parfum',
    130,
    '/images/shop/floral-eau-de-parfum.jpg',
    'Soft floral notes with a polished finish, made for elegant daytime wear.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Eau de Parfum'],
    array['Jasmine'],
    array['Rose'],
    array['100ml', '200ml'],
    3
  ),
  (
    'soothing-argan-oil',
    'Soothing Argan Oil',
    50,
    '/images/shop/soothing-argan-oil.jpg',
    'A lightweight body oil with a smooth glide and warm skin finish.',
    'Body Oils',
    array['100ml', '200ml'],
    array['Body Oils'],
    array['Eau de Parfum'],
    array['Jasmine', 'Vanilla'],
    array['Jasmine'],
    array['100ml', '200ml'],
    4
  ),
  (
    'botanical-repair-oil',
    'Botanical Repair Oil',
    60,
    '/images/shop/botanical-repair-oil.jpg',
    'A restorative body oil with a silky touch and subtle scent trail.',
    'Body Oils',
    array['100ml', '200ml'],
    array['Body Oils'],
    array['Eau de Toilette'],
    array['Lavender', 'Rosehip'],
    array['Rose'],
    array['100ml', '200ml'],
    5
  ),
  (
    'midnight-wood-parfum',
    'Midnight Wood Parfum',
    120,
    '/images/shop/midnight-wood-parfum.jpg',
    'Dark woods and polished spice for a stronger masculine profile.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Eau de Parfum'],
    array['Sandalwood'],
    array['Rose'],
    array['100ml', '200ml'],
    6
  ),
  (
    'emerald-cologne',
    'Emerald Cologne',
    80,
    '/images/shop/emerald-cologne.jpg',
    'Fresh and cool with a bright lift that feels clean and modern.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Eau de Toilette'],
    array['Lavender'],
    array['Jasmine'],
    array['100ml', '200ml'],
    7
  ),
  (
    'amber-reserve',
    'Amber Reserve',
    150,
    '/images/shop/amber-reserve.jpg',
    'An amber-led signature scent with a smooth woody base.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Eau de Parfum'],
    array['Rosehip', 'Vanilla'],
    array['Rose'],
    array['100ml', '200ml'],
    8
  ),
  (
    'rose-veil-mist',
    'Rose Veil Mist',
    95,
    '/images/shop/rose-veil-mist.jpg',
    'A soft romantic mist with airy floral character.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Eau de Toilette'],
    array['Jasmine'],
    array['Rose'],
    array['100ml', '200ml'],
    9
  )
on conflict (slug) do update
set
  name = excluded.name,
  price = excluded.price,
  image_path = excluded.image_path,
  description = excluded.description,
  category = excluded.category,
  sizes = excluded.sizes,
  category_tags = excluded.category_tags,
  concentration_tags = excluded.concentration_tags,
  scent_tags = excluded.scent_tags,
  scent_profile_tags = excluded.scent_profile_tags,
  size_tags = excluded.size_tags,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  slug,
  name,
  price,
  image_path,
  description,
  category,
  sizes,
  category_tags,
  concentration_tags,
  scent_tags,
  scent_profile_tags,
  size_tags,
  sort_order
)
values
  (
    'cedar-noir-cologne',
    'Cedar Noir Cologne',
    140,
    'https://i.pinimg.com/originals/79/d4/48/79d44858753a454116e4af83800539d4.jpg',
    'A dark, polished cologne with cedar, musk and a cool smoky finish.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Eau de Parfum'],
    array['Sandalwood'],
    array['Rose'],
    array['100ml', '200ml'],
    10
  ),
  (
    'blue-atlas-cologne',
    'Blue Atlas Cologne',
    115,
    'https://s.alicdn.com/%40sc04/kf/H7899019432aa48de8bd9c8cf68fcbf0eG/Wholesale-Cologne-Perfume-Vendor-Bulk-Perfume-Distributor-Men-s-Fragrance-Set-Luxury-Mens-Colognes-Designer-Style-for-Resale.png',
    'A fresh blue cologne with citrus brightness, spice and clean woods.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Eau de Toilette'],
    array['Lavender', 'Sandalwood'],
    array['Jasmine'],
    array['100ml', '200ml'],
    11
  ),
  (
    'amber-flint-parfum',
    'Amber Flint Parfum',
    180,
    'https://nim.video/_next/image?q=90&url=https%3A%2F%2Fstatic.nim.video%2Foutput%2Fseo-media%2F0757374b1be20391.png&w=1920',
    'A warm amber parfum with a sharp mineral edge and long evening trail.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Parfum'],
    array['Rosehip', 'Vanilla'],
    array['Rose'],
    array['100ml', '200ml'],
    12
  ),
  (
    'silver-vetiver-mist',
    'Silver Vetiver Mist',
    105,
    'https://i.pinimg.com/originals/c1/52/1d/c1521d4a83cdeffe9b1b1b8322d5c26b.jpg',
    'A clean masculine mist with vetiver character and a crisp metallic lift.',
    'Men''s Perfumes',
    array['100ml', '200ml'],
    array['Men''s Perfumes'],
    array['Eau de Toilette'],
    array['Lavender'],
    array['Jasmine'],
    array['100ml', '200ml'],
    13
  ),
  (
    'orchid-pearl-parfum',
    'Orchid Pearl Parfum',
    145,
    'https://users-photos.b-cdn.net/139784/media/asset/DSC03376.jpg?width=480',
    'A graceful floral parfum with orchid softness, pearly musk and gentle warmth.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Parfum'],
    array['Jasmine', 'Vanilla'],
    array['Rose'],
    array['100ml', '200ml'],
    14
  ),
  (
    'blush-petal-eau-de-parfum',
    'Blush Petal Eau de Parfum',
    125,
    'https://cdn.mos.cms.futurecdn.net/v2/t%3A0%2Cl%3A465%2Ccw%3A1196%2Cch%3A1196%2Cq%3A80%2Cw%3A1196/AQD6baSTvSq5zFsNxaytoH.jpg',
    'A rosy floral fragrance with soft petals, airy sweetness and a smooth dry down.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Eau de Parfum'],
    array['Jasmine', 'Rosehip'],
    array['Rose'],
    array['100ml', '200ml'],
    15
  ),
  (
    'pink-muse-eau-de-toilette',
    'Pink Muse Eau de Toilette',
    90,
    'https://www.getuscart.com/images/thumbs/1285978_kcgani-small-products-photography-background-props-set-waterproof-eva-geometric-cube-photo-props-dis_550.jpeg',
    'A light pink eau de toilette with bright florals and a clean everyday finish.',
    'Women''s Perfumes',
    array['100ml', '200ml'],
    array['Women''s Perfumes'],
    array['Eau de Toilette'],
    array['Jasmine'],
    array['Jasmine'],
    array['100ml', '200ml'],
    16
  ),
  (
    'summer-glow-body-oil',
    'Summer Glow Body Oil',
    68,
    'https://cdn.shopify.com/s/files/1/0694/7844/9441/files/F5044334-79FD-4831-A3A4-AEAB88DE3A82.jpg?v=1715792143',
    'A golden body oil with a tropical glow, made for soft summer skin.',
    'Body Oils',
    array['100ml', '200ml'],
    array['Body Oils'],
    array['Eau de Toilette'],
    array['Vanilla'],
    array['Jasmine'],
    array['100ml', '200ml'],
    17
  ),
  (
    'stone-nectar-body-oil',
    'Stone Nectar Body Oil',
    72,
    'https://quintaesenciawellness.com/cdn/shop/files/Quinta_Esencia_Photoshoot_-_Body_Oil.jpg?v=1740317070',
    'A warm botanical body oil with a silky finish and earthy amber mood.',
    'Body Oils',
    array['100ml', '200ml'],
    array['Body Oils'],
    array['Eau de Parfum'],
    array['Rosehip', 'Vanilla'],
    array['Rose'],
    array['100ml', '200ml'],
    18
  ),
  (
    'amber-leaf-body-oil',
    'Amber Leaf Body Oil',
    64,
    'https://media.cdnws.com/_i/419484/RAW-54/3053/54/pjcosmetics-cat-huiles.png',
    'A simple amber body oil with leafy freshness and a nourishing skin feel.',
    'Body Oils',
    array['100ml', '200ml'],
    array['Body Oils'],
    array['Eau de Toilette'],
    array['Lavender', 'Rosehip'],
    array['Rose'],
    array['100ml', '200ml'],
    19
  )
on conflict (slug) do update
set
  name = excluded.name,
  price = excluded.price,
  image_path = excluded.image_path,
  description = excluded.description,
  category = excluded.category,
  sizes = excluded.sizes,
  category_tags = excluded.category_tags,
  concentration_tags = excluded.concentration_tags,
  scent_tags = excluded.scent_tags,
  scent_profile_tags = excluded.scent_profile_tags,
  size_tags = excluded.size_tags,
  sort_order = excluded.sort_order,
  updated_at = now();
