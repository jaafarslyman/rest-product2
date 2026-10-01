# Supabase setup

The site can be previewed without Supabase. It shows its bundled restaurant
content until the public profile settings are configured.

1. In your Supabase project's SQL Editor, run `restaurants.sql`.
2. Add a row to `public.restaurants` with your restaurant's name and a URL-safe
   slug. Set `is_published` to `true` only after the public details are ready.
3. Add these variables to the app's environment:
   - `VITE_SUPABASE_URL` — the Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY` — the project's public anon/publishable key.
   - `VITE_RESTAURANT_SLUG` — the row's slug; defaults to `aurelia`.
4. Restart the app after changing environment variables.

Only published rows are requested. The existing row-level security policy also
limits anonymous reads to published restaurants. The site does not write to
Supabase and does not need a service-role key. Vite variables are included in
the browser bundle, so never put a service-role key in a `VITE_` variable.

The `cover_image_path` and `gallery_image_paths` fields accept public `http(s)`
image URLs or paths under the site's `/images/` folder. The current schema does
not provision a Supabase Storage bucket.

The website uses `social_links.instagram` as a public `http(s)` URL and reads
`opening_hours` as a JSON object whose values can be text or `{ "open": "...",
"close": "..." }`. It continues to use its bundled content for any missing
fields.

Reservations, orders, restaurant management, and authentication are not part
of this public website. The booking links currently direct visitors to contact
details rather than submitting a reservation.