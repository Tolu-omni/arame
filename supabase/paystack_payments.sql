-- Paystack test/live payment fields.
-- Run this once before using saved cards or verified Paystack checkout.

alter table public.payment_methods
  add column if not exists authorization_code text,
  add column if not exists exp_month text,
  add column if not exists exp_year text,
  add column if not exists bank text,
  add column if not exists email text,
  add column if not exists paystack_customer_code text,
  add column if not exists reusable boolean default false;

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists payment_channel text,
  add column if not exists paid_at timestamptz;
