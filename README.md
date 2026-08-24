## Arame

Arame is a fragrance and body oil storefront built with Next.js, Supabase, Paystack, and email receipts. The app includes a live product catalog, customer accounts, checkout, order tracking, wallet card authorization, and an admin dashboard for products and orders.

## Local Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run images:upload
```

## Production Setup

Add these environment variables in Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://arame-rose.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
EMAIL_FROM=Arame <aramesupport@gmail.com>
GMAIL_USER=aramesupport@gmail.com
GMAIL_APP_PASSWORD=your_google_app_password_without_spaces
ADMIN_EMAILS=your-admin-login@example.com
```

`RESEND_API_KEY` is optional and only needed if the store later uses a verified custom email domain with Resend.

Set the Paystack webhook URL to:

```bash
https://arame-rose.vercel.app/api/paystack/webhook
```

For admin access, add the same admin login email to Supabase by running `supabase/admin_access.sql` in the Supabase SQL Editor after replacing `your-admin-login@example.com`.

After adding `SUPABASE_SERVICE_ROLE_KEY` locally, upload current product images to Supabase Storage and update the live product rows:

```bash
npm run images:upload
```

## Supabase SQL

The main schema lives in `supabase/schema.sql`. Smaller focused files are available for catalog, image storage, Paystack payment fields, blog data, and admin access.

Run the full schema first for a new project:

```bash
supabase/schema.sql
```

Then apply focused update files only when needed:

```bash
supabase/admin_access.sql
supabase/product_catalog.sql
supabase/product_image_storage.sql
supabase/paystack_payments.sql
supabase/blog_migration.sql
```
