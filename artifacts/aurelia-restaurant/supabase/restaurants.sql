-- AURELIA — public restaurant profile foundation for Supabase
-- Paste this script into the Supabase SQL Editor.
--
-- Public visitors can read published restaurant profiles only.
-- No browser-facing role can insert, update, or delete rows. Future
-- management features must write through a trusted server or add narrowly
-- scoped, role-checked policies after authentication is implemented.

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  description text,
  logo_path text,
  cover_image_path text,
  gallery_image_paths text[] not null default '{}'::text[],
  address text,
  phone text,
  opening_hours jsonb,
  social_links jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_opening_hours_object
    check (opening_hours is null or jsonb_typeof(opening_hours) = 'object'),
  constraint restaurants_social_links_object
    check (jsonb_typeof(social_links) = 'object')
);

-- Supports public lookups by URL slug and prevents duplicate slugs.
create unique index if not exists restaurants_slug_idx
  on public.restaurants (slug);

-- Keep updated_at current for trusted server-side edits.
create or replace function public.set_restaurants_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_restaurants_updated_at() from public;
revoke all on function public.set_restaurants_updated_at() from anon, authenticated;

drop trigger if exists set_restaurants_updated_at on public.restaurants;
create trigger set_restaurants_updated_at
  before update on public.restaurants
  for each row
  execute function public.set_restaurants_updated_at();

alter table public.restaurants enable row level security;

-- Allow the public site to read published profiles, but never drafts.
grant usage on schema public to anon, authenticated;
revoke all on table public.restaurants from anon, authenticated;
grant select on table public.restaurants to anon, authenticated;

drop policy if exists "Public can read published restaurants"
  on public.restaurants;
create policy "Public can read published restaurants"
  on public.restaurants
  for select
  to anon, authenticated
  using (is_published = true);

-- Deliberately no INSERT, UPDATE, or DELETE policies are defined.
-- Supabase service_role access belongs only on a trusted server and must
-- never be exposed in customer-facing browser code.