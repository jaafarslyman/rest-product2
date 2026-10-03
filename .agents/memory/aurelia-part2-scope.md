---
name: AURELIA menu phase boundary
description: The explicit boundary between the local Part 2A menu and a later Part 2B database connection.
---

Keep the AURELIA Part 2A menu and cart on local sample data and local storage. The Part 2B menu SQL is a draft for the user to apply manually; do not connect the menu to Supabase or execute the migration during Part 2A. Do not add reservations, checkout/order processing, payments, dashboard features, or table identification unless the user explicitly asks for that later work.

**Why:** The user explicitly scoped Part 2A to a local customer menu and deferred the database and ordering work to later phases.

**How to apply:** Keep the menu and cart client-side in Part 2A. Only wire them to the database as part of an explicit later Part 2B request.