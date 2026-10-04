---
name: AURELIA Supabase menu migration
description: Legacy schema and scope constraints for the active public-menu Supabase integration.
---

Part 2B is active for the public AURELIA menu; the cart remains local and checkout does not submit orders. The user's Supabase project already has menu tables from an earlier draft. Their legacy columns include `sort_order`, `image_path`, `option_type`, `is_required`, and `price_delta`, plus required category/item slugs. Existing item slugs must be lowercase ASCII letters/digits separated by hyphens. Upgrade these tables in place, preserving rows and publication/availability flags; do not drop or recreate them. The user applies the SQL manually.

**Why:** The user reported a missing-column error and later a slug check failure after running the migration, and supplied live Supabase column/index metadata. Existing menu data may already be present, so preserving it is required.

**How to apply:** Use guarded column renames and additive changes for Supabase schema compatibility. Keep `is_published` distinct from `is_available`: unpublished items remain hidden, while unavailable published items can stay visible. Keep order submission, payments, and restaurant management out of scope unless requested.