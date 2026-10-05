-- Compact upgrade for the existing legacy AURELIA menu tables.
-- Preserves existing rows; adds eight starter dishes (one per category).
-- Assumes restaurants and all four menu_* tables already exist.
begin;

do $$
declare a record;
begin
  for a in
    select * from (values
      ('menu_categories', 'sort_order', 'display_order'),
      ('menu_items', 'sort_order', 'display_order'),
      ('menu_items', 'image_path', 'image_url'),
      ('menu_item_options', 'sort_order', 'display_order'),
      ('menu_item_options', 'option_type', 'selection_type'),
      ('menu_item_options', 'is_required', 'required'),
      ('menu_item_option_values', 'sort_order', 'display_order'),
      ('menu_item_option_values', 'price_delta', 'price_modifier')
    ) as aliases(table_name, old_name, new_name)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = a.table_name
        and column_name = a.old_name
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = a.table_name
        and column_name = a.new_name
    ) then
      execute format(
        'alter table public.%I rename column %I to %I',
        a.table_name, a.old_name, a.new_name
      );
    end if;
  end loop;
end;
$$;

alter table public.menu_categories
  add column if not exists display_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.menu_items
  add column if not exists image_url text,
  add column if not exists currency_code text not null default 'USD',
  add column if not exists is_available boolean not null default true,
  add column if not exists is_published boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists display_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.menu_item_options
  add column if not exists selection_type text not null default 'multiple',
  add column if not exists required boolean not null default false,
  add column if not exists max_selections integer not null default 1,
  add column if not exists display_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.menu_item_option_values
  add column if not exists price_modifier numeric(10,2) not null default 0,
  add column if not exists is_available boolean not null default true,
  add column if not exists display_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists menu_categories_public_order_idx
  on public.menu_categories (restaurant_id, is_active, display_order);
create index if not exists menu_items_public_category_order_idx
  on public.menu_items (restaurant_id, category_id, display_order);
create index if not exists menu_item_options_item_order_idx
  on public.menu_item_options (restaurant_id, menu_item_id, display_order);
create index if not exists menu_item_option_values_public_order_idx
  on public.menu_item_option_values
    (restaurant_id, option_id, is_available, display_order);

create or replace function public.set_menu_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_menu_updated_at() from public, anon, authenticated;

drop trigger if exists set_menu_categories_updated_at on public.menu_categories;
create trigger set_menu_categories_updated_at before update on public.menu_categories
  for each row execute function public.set_menu_updated_at();
drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at before update on public.menu_items
  for each row execute function public.set_menu_updated_at();
drop trigger if exists set_menu_item_options_updated_at on public.menu_item_options;
create trigger set_menu_item_options_updated_at before update on public.menu_item_options
  for each row execute function public.set_menu_updated_at();
drop trigger if exists set_menu_item_option_values_updated_at
  on public.menu_item_option_values;
create trigger set_menu_item_option_values_updated_at
  before update on public.menu_item_option_values
  for each row execute function public.set_menu_updated_at();

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_options enable row level security;
alter table public.menu_item_option_values enable row level security;

revoke all on table public.menu_categories from public, anon, authenticated;
revoke all on table public.menu_items from public, anon, authenticated;
revoke all on table public.menu_item_options from public, anon, authenticated;
revoke all on table public.menu_item_option_values from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.menu_categories to anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant select on public.menu_item_options to anon, authenticated;
grant select on public.menu_item_option_values to anon, authenticated;

drop policy if exists "Public can read active restaurant menu categories"
  on public.menu_categories;
create policy "Public can read active restaurant menu categories"
  on public.menu_categories for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.restaurants r
      where r.id = menu_categories.restaurant_id and r.is_published
    )
  );

drop policy if exists "Public can read items in active public categories"
  on public.menu_items;
create policy "Public can read items in active public categories"
  on public.menu_items for select to anon, authenticated
  using (
    is_published and exists (
      select 1
      from public.restaurants r
      join public.menu_categories c
        on c.restaurant_id = r.id and c.id = menu_items.category_id
      where r.id = menu_items.restaurant_id
        and r.is_published and c.is_active
    )
  );

drop policy if exists "Public can read options for active public menu items"
  on public.menu_item_options;
create policy "Public can read options for active public menu items"
  on public.menu_item_options for select to anon, authenticated
  using (
    exists (
      select 1
      from public.menu_items i
      join public.menu_categories c
        on c.restaurant_id = i.restaurant_id and c.id = i.category_id
      join public.restaurants r on r.id = i.restaurant_id
      where i.id = menu_item_options.menu_item_id
        and i.restaurant_id = menu_item_options.restaurant_id
        and i.is_published and c.is_active and r.is_published
    )
  );

drop policy if exists "Public can read available values for public menu options"
  on public.menu_item_option_values;
create policy "Public can read available values for public menu options"
  on public.menu_item_option_values for select to anon, authenticated
  using (
    is_available and exists (
      select 1
      from public.menu_item_options o
      join public.menu_items i
        on i.restaurant_id = o.restaurant_id and i.id = o.menu_item_id
      join public.menu_categories c
        on c.restaurant_id = i.restaurant_id and c.id = i.category_id
      join public.restaurants r on r.id = i.restaurant_id
      where o.id = menu_item_option_values.option_id
        and o.restaurant_id = menu_item_option_values.restaurant_id
        and i.is_published and c.is_active and r.is_published
    )
  );

insert into public.restaurants (name, slug, description, is_published)
values ('AURELIA', 'aurelia', 'نكهات من ضفّتَي المتوسط، وموسم يكتب فصله كل يوم.', true)
on conflict (slug) do nothing;

insert into public.menu_categories
  (restaurant_id, name, slug, description, display_order, is_active)
select r.id, s.name, s.slug, s.description, s.display_order, true
from public.restaurants r
cross join (values
  ('المقبلات', 'mezze', 'لقيمات أولى تفتح حكاية المائدة.', 10),
  ('السلطات', 'salads', 'خضرة موسمية ونكهات من الحديقة.', 20),
  ('الأطباق الرئيسية', 'main-courses', 'أطباق دافئة تُحضّر على مهل.', 30),
  ('المشاوي', 'grills', 'نكهة الفحم والأعشاب الطازجة.', 40),
  ('البيتزا', 'pizza', 'عجين مخمّر وخَبز على نار الحطب.', 50),
  ('المعكرونة', 'pasta', 'عجين طازج وصلصات متوسطية.', 60),
  ('الحلويات', 'desserts', 'ختام حلو بلمسة أوريليا.', 70),
  ('المشروبات', 'drinks', 'رشفات باردة من الفاكهة والأعشاب.', 80)
) as s(name, slug, description, display_order)
where r.slug = 'aurelia'
  and not exists (
    select 1 from public.menu_categories c
    where c.restaurant_id = r.id and c.name = s.name
  )
on conflict do nothing;

insert into public.menu_items (
  restaurant_id, category_id, slug, name, description, price, currency_code,
  image_url, ingredients, allergens, is_available, is_published, is_featured,
  badge, display_order
)
select r.id, c.id, s.slug, s.name, s.description, s.price, 'USD', s.image_url,
       s.ingredients, s.allergens, true, true, s.is_featured, s.badge, 10
from public.restaurants r
join (values
  ('المقبلات', 'aurelia-seed-mezze-10', 'حمّص أوريليا',
   'حمّص مخملي، زيت زيتون بكر، حمص مقرمش وخبز تنور دافئ.',
   12.00::numeric, '/images/menu/mezze.webp',
   array['حمّص','طحينة','ليمون','زيت زيتون','سماق']::text[],
   array['سمسم','قمح']::text[], true, 'most_ordered'::text),
  ('السلطات', 'aurelia-seed-salads-10', 'سلطة الحديقة',
   'طماطم ناضجة، خيار، أعشاب طازجة، زيتون وزيت زيتون ليموني.',
   15.00::numeric, '/images/menu/salad.webp',
   array['طماطم','خيار','بقدونس','نعناع','زيتون','ليمون']::text[],
   array[]::text[], false, null::text),
  ('الأطباق الرئيسية', 'aurelia-seed-main-courses-10', 'كتف الغنم على مهل',
   'كتف غنم مطهو لساعات، دبس رمان، فريكة محمّصة وأعشاب الحديقة.',
   38.00::numeric, '/images/menu/lamb.webp',
   array['كتف غنم','دبس رمان','فريكة','زعتر بري','لبن']::text[],
   array['قمح','حليب']::text[], true, 'chef_pick'::text),
  ('المشاوي', 'aurelia-seed-grills-10', 'مشاوي أوريليا',
   'كباب لحم متبّل، دجاج مشوي، خضار على الفحم وصلصة طحينة.',
   34.00::numeric, '/images/menu/grill.webp',
   array['لحم بقري','دجاج','فلفل مشوي','طحينة','سماق']::text[],
   array['سمسم']::text[], true, 'most_ordered'::text),
  ('البيتزا', 'aurelia-seed-pizza-10', 'بيتزا التين والريكوتا',
   'عجين مخمّر، تين موسمي، ريكوتا كريمية، عسل وإكليل الجبل.',
   21.00::numeric, '/images/menu/pizza.webp',
   array['عجين قمح','تين','ريكوتا','عسل','إكليل الجبل']::text[],
   array['قمح','حليب']::text[], true, 'new'::text),
  ('المعكرونة', 'aurelia-seed-pasta-10', 'تالياتيلي الروبيان والزعفران',
   'معكرونة طازجة، روبيان، زعفران، طماطم كرزية ولمسة كريمة.',
   27.00::numeric, '/images/menu/pasta.webp',
   array['تالياتيلي قمح','روبيان','زعفران','كريمة','طماطم']::text[],
   array['قمح','قشريات','حليب']::text[], true, 'chef_pick'::text),
  ('الحلويات', 'aurelia-seed-desserts-10', 'ميل فوي الفستق والورد',
   'رقائق مورّقة، كريمة ورد خفيفة، فستق حلبي وتوت أحمر.',
   14.00::numeric, '/images/menu/dessert.webp',
   array['عجينة مورّقة','فستق','كريمة','ماء ورد','توت']::text[],
   array['قمح','مكسرات','حليب']::text[], true, 'most_ordered'::text),
  ('المشروبات', 'aurelia-seed-drinks-10', 'سبريتز الرمان والبرتقال',
   'رمان حامض، برتقال طازج، ماء فوار وإكليل الجبل.',
   10.00::numeric, '/images/menu/drinks.webp',
   array['رمان','برتقال','ماء فوار','إكليل الجبل']::text[],
   array[]::text[], true, 'most_ordered'::text)
) as s(category_name, slug, name, description, price, image_url,
       ingredients, allergens, is_featured, badge)
  on true
join public.menu_categories c
  on c.restaurant_id = r.id and c.name = s.category_name
where r.slug = 'aurelia'
  and not exists (
    select 1 from public.menu_items i
    where i.restaurant_id = r.id and i.category_id = c.id and i.name = s.name
  )
on conflict do nothing;

commit;
