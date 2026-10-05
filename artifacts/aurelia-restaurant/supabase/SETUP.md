# Supabase setup

The `/menu` page now reads its public categories, dishes, options, and prices
from Supabase. It does not fall back to bundled menu records if the request
fails.

1. In the Supabase SQL Editor, run `restaurants.sql` if the Part 1 table does
   not already exist.
2. For an existing earlier-draft schema, run `menu_part2b_compact.sql`. It
   upgrades the four existing menu tables in place, applies read-only public
   policies, and adds one starter dish per category without dropping rows.
   For a fresh install, use `menu_part2b.sql` instead.
3. If an existing AURELIA restaurant row is unpublished, publish it in Supabase
   before expecting public menu data. The menu migration does not change an
   existing restaurant's profile or publication state.
4. Confirm these variables are present in the app's environment:
   - `VITE_SUPABASE_URL` — the Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY` — the project's public anon/publishable key.
   - `VITE_RESTAURANT_SLUG` — the row's slug; defaults to `aurelia`.
5. Restart the app after changing environment variables.

Only published restaurant data is requested. The menu requires the public
read-only policies from `menu_part2b.sql`; it never writes menu data and does
not need a service-role key. Vite variables are included in the browser bundle,
so never put a service-role key in a `VITE_` variable. Successful menu reads
are cached in memory for 45 seconds to avoid repeated requests.

The migration preserves existing menu rows and their publication/availability
flags. Unpublished items stay hidden; unavailable items remain visible with
their unavailable status.

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