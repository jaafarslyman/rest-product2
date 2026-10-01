# AURELIA — أوريليا

An Arabic-first public website for a modern Mediterranean restaurant, imported from [jaafarslyman/rest-product](https://github.com/jaafarslyman/rest-product).

## Run & Operate

- `pnpm --filter @workspace/aurelia-restaurant run dev` — run the restaurant website
- `pnpm --filter @workspace/aurelia-restaurant run typecheck` — typecheck the website
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Optional environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_RESTAURANT_SLUG`
- `VITE_RESTAURANT_SLUG` defaults to `aurelia`; configure the two Supabase variables to load the published profile.
- Supabase setup and the read-only schema are documented in `artifacts/aurelia-restaurant/supabase/SETUP.md`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Website: React, Vite, TypeScript, Tailwind CSS
- Optional profile source: Supabase REST API with anonymous read access and row-level security

## Where things live

- `artifacts/aurelia-restaurant/src/App.tsx` — Arabic-first restaurant homepage and profile rendering
- `artifacts/aurelia-restaurant/src/lib/supabase-profile.ts` — optional, read-only published-profile fetch
- `artifacts/aurelia-restaurant/public/images/` — bundled visual assets and offline fallback content
- `artifacts/aurelia-restaurant/supabase/restaurants.sql` — public profile table and RLS policy

## Architecture decisions

- Restaurant details load from Supabase only when both public URL and anon key are configured; bundled content keeps the site usable without them.
- Browser access is read-only and restricted to published restaurant rows; never expose a Supabase service-role key.
- Reservation links are informational/contact links, not a reservation submission system.

## Product

The public homepage introduces the restaurant, highlights dishes and dining atmosphere, and displays published address, hours, phone, and Instagram details when available.

## User preferences

## Gotchas

- Supabase variables prefixed with `VITE_` are visible in the browser; only the public anon/publishable key belongs there.
- Run `restaurants.sql` in Supabase and publish a row using the configured slug before expecting live profile details.
- The current Supabase schema does not create a Storage bucket; image fields need public URLs or site-local `/images/` paths.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
