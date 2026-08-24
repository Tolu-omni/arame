create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now(),
  display_name text,
  title text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  updated_at timestamptz default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  company text,
  address_line_1 text,
  address_line_2 text,
  city text,
  country text,
  state text,
  postal_code text,
  phone text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  method_type text,
  last4 text,
  authorization_code text,
  exp_month text,
  exp_year text,
  bank text,
  email text,
  paystack_customer_code text,
  reusable boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.payment_methods enable row level security;

alter table public.payment_methods
  add column if not exists authorization_code text,
  add column if not exists exp_month text,
  add column if not exists exp_year text,
  add column if not exists bank text,
  add column if not exists email text,
  add column if not exists paystack_customer_code text,
  add column if not exists reusable boolean default false;

alter table public.profiles
  add column if not exists created_at timestamptz default now();

drop policy if exists "profiles are owned by user" on public.profiles;
create policy "profiles are owned by user"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "admins can view all profiles" on public.profiles;
create policy "admins can view all profiles"
  on public.profiles for select
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

drop policy if exists "addresses are owned by user" on public.addresses;
create policy "addresses are owned by user"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "payment labels are owned by user" on public.payment_methods;
create policy "payment labels are owned by user"
  on public.payment_methods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar files are public" on storage.objects;
create policy "avatar files are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

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

-- Blog stats (views and likes per post ID)
create table if not exists public.blog_stats (
  post_id integer primary key,
  views integer default 0,
  likes integer default 0
);

alter table public.blog_stats enable row level security;

drop policy if exists "blog stats are readable by anyone" on public.blog_stats;
create policy "blog stats are readable by anyone" on public.blog_stats for select using (true);

drop policy if exists "blog stats are updatable by anyone" on public.blog_stats;
create policy "blog stats are updatable by anyone" on public.blog_stats for update using (true);

-- Initialize default stats
insert into public.blog_stats (post_id, views, likes)
values (1, 124, 42), (2, 245, 87), (3, 189, 64)
on conflict (post_id) do nothing;

-- Blog comments
create table if not exists public.blog_comments (
  id bigint primary key generated by default as identity,
  post_id integer not null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  text text not null,
  attachment_url text,
  attachment_type text,
  likes integer default 0,
  created_at timestamptz default now()
);

alter table public.blog_comments enable row level security;

drop policy if exists "blog comments are readable by anyone" on public.blog_comments;
create policy "blog comments are readable by anyone" on public.blog_comments for select using (true);

drop policy if exists "blog comments can be created by anyone" on public.blog_comments;
create policy "blog comments can be created by anyone" on public.blog_comments for insert with check (true);

drop policy if exists "blog comments can be updated by owner" on public.blog_comments;
create policy "blog comments can be updated by owner" on public.blog_comments for update using (auth.uid() = user_id or user_id is null);

drop policy if exists "blog comments can be deleted by owner" on public.blog_comments;
create policy "blog comments can be deleted by owner" on public.blog_comments for delete using (auth.uid() = user_id);

-- Blog comment replies
create table if not exists public.blog_comment_replies (
  id bigint primary key generated by default as identity,
  comment_id bigint not null references public.blog_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  text text not null,
  created_at timestamptz default now()
);

alter table public.blog_comment_replies enable row level security;

drop policy if exists "blog comment replies are readable by anyone" on public.blog_comment_replies;
create policy "blog comment replies are readable by anyone" on public.blog_comment_replies for select using (true);

drop policy if exists "blog comment replies can be created by anyone" on public.blog_comment_replies;
create policy "blog comment replies can be created by anyone" on public.blog_comment_replies for insert with check (true);

-- Initialize default comments
insert into public.blog_comments (id, post_id, author_name, text, likes, created_at)
values
  (10001, 1, 'Amara Okoye', 'The Royal Oud sounds absolutely magnificent. Exactly what I need for evening events!', 4, now() - interval '2 hours'),
  (10002, 2, 'Tolu Omoniyi', 'wow thats beautiful u feel me', 1, now() - interval '3 minutes'),
  (10003, 3, 'Chinedu Okafor', 'Super helpful guide. I never realized the differences in EDP and EDT concentrations!', 3, now() - interval '1 day')
on conflict (id) do nothing;

-- Initialize storage bucket for blog attachments
insert into storage.buckets (id, name, public)
values ('blog-attachments', 'blog-attachments', true)
on conflict (id) do nothing;

drop policy if exists "blog attachments are public" on storage.objects;
create policy "blog attachments are public"
  on storage.objects for select
  using (bucket_id = 'blog-attachments');

drop policy if exists "anyone can upload blog attachments" on storage.objects;
create policy "anyone can upload blog attachments"
  on storage.objects for insert
  with check (bucket_id = 'blog-attachments');

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending', -- pending, paid, processing, packed, shipped, delivered, cancelled
  tracking_code text default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  items jsonb not null,
  total numeric not null,
  shipping_address jsonb,
  payment_provider text,
  payment_reference text,
  payment_channel text,
  paid_at timestamptz,
  status_updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

alter table public.orders
  add column if not exists tracking_code text,
  add column if not exists shipping_address jsonb,
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists payment_channel text,
  add column if not exists paid_at timestamptz,
  add column if not exists status_updated_at timestamptz default now();

alter table public.orders
  alter column tracking_code set default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  alter column status_updated_at set default now();

update public.orders
set tracking_code = upper(substr(md5(id::text || coalesce(payment_reference, '') || created_at::text), 1, 10))
where tracking_code is null;

update public.orders
set status_updated_at = coalesce(status_updated_at, paid_at, created_at, now())
where status_updated_at is null;

create unique index if not exists orders_tracking_code_key
  on public.orders (tracking_code)
  where tracking_code is not null;

create or replace function public.set_order_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_order_status_updated_at on public.orders;
create trigger set_order_status_updated_at
  before update on public.orders
  for each row execute function public.set_order_status_updated_at();

drop policy if exists "users can view their own orders" on public.orders;
create policy "users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "admins can view all orders" on public.orders;
create policy "admins can view all orders"
  on public.orders for select
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "admins can update order tracking" on public.orders;
create policy "admins can update order tracking"
  on public.orders for update
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

drop policy if exists "users/guests can insert orders" on public.orders;
create policy "users/guests can insert orders"
  on public.orders for insert
  with check (true);

create or replace function public.get_order_tracking(p_order_id uuid, p_tracking_code text)
returns table (
  id uuid,
  status text,
  tracking_code text,
  items jsonb,
  total numeric,
  shipping_address jsonb,
  payment_provider text,
  payment_reference text,
  payment_channel text,
  paid_at timestamptz,
  status_updated_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    orders.id,
    orders.status,
    orders.tracking_code,
    orders.items,
    orders.total,
    orders.shipping_address,
    orders.payment_provider,
    orders.payment_reference,
    orders.payment_channel,
    orders.paid_at,
    orders.status_updated_at,
    orders.created_at
  from public.orders
  where orders.id = p_order_id
    and orders.tracking_code = upper(trim(p_tracking_code))
  limit 1;
$$;

revoke all on function public.get_order_tracking(uuid, text) from public;
grant execute on function public.get_order_tracking(uuid, text) to anon, authenticated;

create table if not exists public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  tracking_code text,
  status text,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.order_notifications enable row level security;

drop policy if exists "users can view own order notifications" on public.order_notifications;
create policy "users can view own order notifications"
  on public.order_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "users can update own order notifications" on public.order_notifications;
create policy "users can update own order notifications"
  on public.order_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins can view all order notifications" on public.order_notifications;
create policy "admins can view all order notifications"
  on public.order_notifications for select
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));

create or replace function public.create_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_title text;
  next_message text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  next_title := case new.status
    when 'paid' then 'Payment confirmed'
    when 'processing' then 'Order is being prepared'
    when 'packed' then 'Order packed'
    when 'shipped' then 'Order is out for delivery'
    when 'delivered' then 'Order delivered'
    when 'fulfilled' then 'Order delivered'
    when 'cancelled' then 'Order cancelled'
    else 'Order update'
  end;

  next_message := case new.status
    when 'paid' then 'Your Arame order has been received and payment is confirmed.'
    when 'processing' then 'Your Arame order is now being prepared.'
    when 'packed' then 'Your Arame order has been packed.'
    when 'shipped' then 'Your Arame order is marked as out for delivery.'
    when 'delivered' then 'Your Arame order is marked as delivered.'
    when 'fulfilled' then 'Your Arame order is marked as delivered.'
    when 'cancelled' then 'Your Arame order has been cancelled.'
    else 'Your Arame order status was updated.'
  end;

  insert into public.order_notifications (
    order_id,
    user_id,
    tracking_code,
    status,
    title,
    message
  )
  values (
    new.id,
    new.user_id,
    new.tracking_code,
    new.status,
    next_title,
    next_message
  );

  return new;
end;
$$;

drop trigger if exists create_order_status_notification on public.orders;
create trigger create_order_status_notification
  after insert or update of status on public.orders
  for each row execute function public.create_order_status_notification();

create or replace function public.get_order_tracking_notifications(p_order_id uuid, p_tracking_code text)
returns table (
  id uuid,
  title text,
  message text,
  status text,
  created_at timestamptz,
  read_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    order_notifications.id,
    order_notifications.title,
    order_notifications.message,
    order_notifications.status,
    order_notifications.created_at,
    order_notifications.read_at
  from public.order_notifications
  where order_notifications.order_id = p_order_id
    and order_notifications.tracking_code = upper(trim(p_tracking_code))
  order by order_notifications.created_at desc
  limit 12;
$$;

revoke all on function public.get_order_tracking_notifications(uuid, text) from public;
grant execute on function public.get_order_tracking_notifications(uuid, text) to anon, authenticated;

-- Admin dashboard sign-in events
create table if not exists public.sign_in_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  event_type text not null default 'sign_in',
  created_at timestamptz default now()
);

alter table public.sign_in_events enable row level security;

drop policy if exists "users can log own sign ins" on public.sign_in_events;
create policy "users can log own sign ins"
  on public.sign_in_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "admins can view all sign ins" on public.sign_in_events;
create policy "admins can view all sign ins"
  on public.sign_in_events for select
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('toluomoniyi9@gmail.com', 'toluomoniyi@gmail.com', 'tolu@arame.com'));
