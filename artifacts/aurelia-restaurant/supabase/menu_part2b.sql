-- AURELIA — Part 2B public menu schema and sample content
-- Run restaurants.sql first. This migration upgrades menu tables in place;
-- it does not alter the Part 1 restaurants table or grant public write access.
begin;

-- Upgrade the earlier menu draft in place. Renaming columns preserves the
-- existing values, and PostgreSQL updates dependent indexes automatically.
do $$
declare
  alias_row record;
begin
  for alias_row in
    select *
    from (values
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
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = alias_row.table_name
        and c.column_name = alias_row.old_name
    ) and not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = alias_row.table_name
        and c.column_name = alias_row.new_name
    ) then
      execute format(
        'alter table public.%I rename column %I to %I',
        alias_row.table_name,
        alias_row.old_name,
        alias_row.new_name
      );
    end if;
  end loop;
end;
$$;

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

revoke all on function public.set_menu_updated_at() from public;
revoke all on function public.set_menu_updated_at() from anon, authenticated;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  slug text not null check (length(trim(slug)) > 0),
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_categories_restaurant_slug_unique
    unique (restaurant_id, slug),
  constraint menu_categories_restaurant_name_unique
    unique (restaurant_id, name),
  constraint menu_categories_restaurant_id_unique
    unique (restaurant_id, id)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  slug text not null check (length(trim(slug)) > 0),
  name text not null check (length(trim(name)) > 0),
  description text not null check (length(trim(description)) > 0),
  price numeric(10, 2) not null check (price >= 0),
  currency_code text not null default 'USD',
  image_url text check (image_url is null or length(trim(image_url)) > 0),
  ingredients text[] not null default '{}'::text[],
  allergens text[] not null default '{}'::text[],
  is_available boolean not null default true,
  is_published boolean not null default true,
  is_featured boolean not null default false,
  badge text check (badge is null or badge in ('most_ordered', 'new', 'chef_pick')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_restaurant_category_name_unique
    unique (restaurant_id, category_id, name),
  constraint menu_items_restaurant_slug_unique
    unique (restaurant_id, slug),
  constraint menu_items_restaurant_id_unique
    unique (restaurant_id, id),
  constraint menu_items_category_same_restaurant_fk
    foreign key (restaurant_id, category_id)
    references public.menu_categories(restaurant_id, id)
    on delete cascade
);

create table if not exists public.menu_item_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  menu_item_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  selection_type text not null default 'multiple'
    check (selection_type in ('single', 'multiple')),
  required boolean not null default false,
  max_selections integer not null default 1 check (max_selections >= 1),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_options_selection_limit_check
    check (selection_type <> 'single' or max_selections = 1),
  constraint menu_item_options_item_name_unique
    unique (restaurant_id, menu_item_id, name),
  constraint menu_item_options_restaurant_id_unique
    unique (restaurant_id, id),
  constraint menu_item_options_item_same_restaurant_fk
    foreign key (restaurant_id, menu_item_id)
    references public.menu_items(restaurant_id, id)
    on delete cascade
);

create table if not exists public.menu_item_option_values (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  option_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  price_modifier numeric(10, 2) not null default 0,
  is_available boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_option_values_option_name_unique
    unique (option_id, name),
  constraint menu_item_option_values_option_same_restaurant_fk
    foreign key (restaurant_id, option_id)
    references public.menu_item_options(restaurant_id, id)
    on delete cascade
);

-- Complete columns on tables created by the earlier draft. Existing rows are
-- retained; defaults apply only to columns that were genuinely absent.
alter table public.menu_categories
  add column if not exists display_order integer not null default 0;
alter table public.menu_items
  add column if not exists image_url text,
  add column if not exists currency_code text not null default 'USD',
  add column if not exists is_published boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists display_order integer not null default 0;
alter table public.menu_item_options
  add column if not exists selection_type text not null default 'multiple',
  add column if not exists required boolean not null default false,
  add column if not exists max_selections integer not null default 1,
  add column if not exists display_order integer not null default 0;
alter table public.menu_item_option_values
  add column if not exists price_modifier numeric(10, 2) not null default 0,
  add column if not exists is_available boolean not null default true,
  add column if not exists display_order integer not null default 0;

create index if not exists menu_categories_public_order_idx
  on public.menu_categories (restaurant_id, is_active, display_order);
create index if not exists menu_items_public_category_order_idx
  on public.menu_items (restaurant_id, category_id, display_order);
create index if not exists menu_item_options_item_order_idx
  on public.menu_item_options (restaurant_id, menu_item_id, display_order);
create index if not exists menu_item_option_values_public_order_idx
  on public.menu_item_option_values
    (restaurant_id, option_id, is_available, display_order);

drop trigger if exists set_menu_categories_updated_at
  on public.menu_categories;
create trigger set_menu_categories_updated_at
  before update on public.menu_categories
  for each row execute function public.set_menu_updated_at();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_menu_updated_at();

drop trigger if exists set_menu_item_options_updated_at
  on public.menu_item_options;
create trigger set_menu_item_options_updated_at
  before update on public.menu_item_options
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
grant select on table public.menu_categories to anon, authenticated;
grant select on table public.menu_items to anon, authenticated;
grant select on table public.menu_item_options to anon, authenticated;
grant select on table public.menu_item_option_values to anon, authenticated;

drop policy if exists "Public can read active restaurant menu categories"
  on public.menu_categories;
create policy "Public can read active restaurant menu categories"
  on public.menu_categories
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1
      from public.restaurants r
      where r.id = menu_categories.restaurant_id
        and r.is_published = true
    )
  );

-- Unavailable dishes stay visible so the customer can see their status.
drop policy if exists "Public can read items in active public categories"
  on public.menu_items;
create policy "Public can read items in active public categories"
  on public.menu_items
  for select to anon, authenticated
  using (
    is_published
    and exists (
      select 1
      from public.restaurants r
      join public.menu_categories c
        on c.restaurant_id = r.id
       and c.id = menu_items.category_id
      where r.id = menu_items.restaurant_id
        and r.is_published = true
        and c.is_active = true
    )
  );

drop policy if exists "Public can read options for active public menu items"
  on public.menu_item_options;
create policy "Public can read options for active public menu items"
  on public.menu_item_options
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.menu_items i
      join public.menu_categories c
        on c.restaurant_id = i.restaurant_id
       and c.id = i.category_id
      join public.restaurants r on r.id = i.restaurant_id
      where i.id = menu_item_options.menu_item_id
        and i.restaurant_id = menu_item_options.restaurant_id
        and c.is_active = true
        and r.is_published = true
    )
  );

drop policy if exists "Public can read available values for public menu options"
  on public.menu_item_option_values;
create policy "Public can read available values for public menu options"
  on public.menu_item_option_values
  for select to anon, authenticated
  using (
    is_available
    and exists (
      select 1
      from public.menu_item_options o
      join public.menu_items i
        on i.restaurant_id = o.restaurant_id
       and i.id = o.menu_item_id
      join public.menu_categories c
        on c.restaurant_id = i.restaurant_id
       and c.id = i.category_id
      join public.restaurants r on r.id = i.restaurant_id
      where o.id = menu_item_option_values.option_id
        and o.restaurant_id = menu_item_option_values.restaurant_id
        and c.is_active = true
        and r.is_published = true
    )
  );

-- Use the existing AURELIA row. Only create a published starter row if it is
-- genuinely missing; ON CONFLICT never overwrites an existing profile.
insert into public.restaurants (name, slug, description, is_published)
values (
  'AURELIA',
  'aurelia',
  'نكهات من ضفّتَي المتوسط، وموسم يكتب فصله كل يوم.',
  true
)
on conflict (slug) do nothing;

insert into public.menu_categories
  (restaurant_id, name, slug, description, display_order, is_active)
select r.id, seed.name, seed.slug, seed.description, seed.display_order, true
from public.restaurants r
cross join (
  values
    ('المقبلات', 'mezze', 'لقيمات أولى تفتح حكاية المائدة.', 10),
    ('السلطات', 'salads', 'خضرة موسمية ونكهات من الحديقة.', 20),
    ('الأطباق الرئيسية', 'main-courses', 'أطباق دافئة تُحضّر على مهل.', 30),
    ('المشاوي', 'grills', 'نكهة الفحم والأعشاب الطازجة.', 40),
    ('البيتزا', 'pizza', 'عجين مخمّر وخَبز على نار الحطب.', 50),
    ('المعكرونة', 'pasta', 'عجين طازج وصلصات متوسطية.', 60),
    ('الحلويات', 'desserts', 'ختام حلو بلمسة أوريليا.', 70),
    ('المشروبات', 'drinks', 'رشفات باردة من الفاكهة والأعشاب.', 80)
) as seed(name, slug, description, display_order)
where r.slug = 'aurelia'
  and not exists (
    select 1
    from public.menu_categories existing
    where existing.restaurant_id = r.id
      and existing.name = seed.name
  )
on conflict do nothing;

insert into public.menu_items (
  restaurant_id, category_id, slug, name, description, price, currency_code,
  image_url, ingredients, allergens, is_available, is_published, is_featured,
  badge, display_order
)
select
  r.id, c.id,
  'aurelia-seed-' || case seed.category_name
    when 'المقبلات' then 'mezze'
    when 'السلطات' then 'salads'
    when 'الأطباق الرئيسية' then 'main-courses'
    when 'المشاوي' then 'grills'
    when 'البيتزا' then 'pizza'
    when 'المعكرونة' then 'pasta'
    when 'الحلويات' then 'desserts'
    when 'المشروبات' then 'drinks'
  end || '-' || lpad(seed.display_order::text, 2, '0'),
  seed.name, seed.description, seed.price, 'USD', seed.image_url,
  seed.ingredients, seed.allergens, true, true, seed.is_featured,
  seed.badge, seed.display_order
from public.restaurants r
cross join (
  values
    ('المقبلات', 'حمّص أوريليا',
      'حمّص مخملي، زيت زيتون بكر، حمص مقرمش وخبز تنور دافئ.',
      12.00::numeric, '/images/menu/mezze.webp',
      array['حمّص', 'طحينة', 'ليمون', 'زيت زيتون', 'سماق']::text[],
      array['سمسم', 'قمح']::text[], true, 'most_ordered'::text, 10),
    ('المقبلات', 'حلّوم مقرمش',
      'أصابع حلّوم ذهبية، عسل زعتر، رمان طازج ونعناع.',
      16.00::numeric, '/images/menu/halloumi.webp',
      array['جبن حلّوم', 'عسل', 'زعتر', 'رمان', 'نعناع']::text[],
      array['حليب']::text[], false, null::text, 20),
    ('المقبلات', 'رقائق السبانخ والليمون',
      'رقائق عجين مورّق محشوة بسبانخ الموسم وبصل وسماق.',
      13.00::numeric, '/images/menu/mezze.webp',
      array['سبانخ', 'بصل', 'سماق', 'عجين قمح', 'زيت زيتون']::text[],
      array['قمح']::text[], false, 'new'::text, 30),
    ('المقبلات', 'كبة الكرز الحامض',
      'كبة برغل مقرمشة بحشوة لحم متبّل وصلصة كرز حامض.',
      18.00::numeric, '/images/menu/grill.webp',
      array['برغل', 'لحم بقري', 'كرز حامض', 'صنوبر', 'بهارات']::text[],
      array['قمح', 'مكسرات']::text[], false, null::text, 40),

    ('السلطات', 'سلطة الحديقة',
      'طماطم ناضجة، خيار، أعشاب طازجة، زيتون وزيت زيتون ليموني.',
      15.00::numeric, '/images/menu/salad.webp',
      array['طماطم', 'خيار', 'بقدونس', 'نعناع', 'زيتون', 'ليمون']::text[],
      array[]::text[], false, null::text, 10),
    ('السلطات', 'شمندر ولبنة',
      'شمندر مشوي، لبنة مخفوقة، جوز محمّص ودبس رمان.',
      17.00::numeric, '/images/menu/beet-salad.webp',
      array['شمندر', 'لبنة', 'جوز', 'دبس رمان', 'شبت']::text[],
      array['حليب', 'مكسرات']::text[], false, 'chef_pick'::text, 20),
    ('السلطات', 'فتوش أوريليا',
      'خضار مقرمشة، خبز محمّص، سماق وخلطة دبس الرمان.',
      16.00::numeric, '/images/menu/salad.webp',
      array['خس', 'طماطم', 'خيار', 'فجل', 'خبز قمح', 'سماق']::text[],
      array['قمح']::text[], false, 'most_ordered'::text, 30),
    ('السلطات', 'بطيخ وفيتا',
      'بطيخ بارد، جبن فيتا، نعناع، زيتون أسود ولمسة ليمون.',
      18.00::numeric, '/images/menu/beet-salad.webp',
      array['بطيخ', 'جبن فيتا', 'نعناع', 'زيتون', 'ليمون']::text[],
      array['حليب']::text[], false, 'new'::text, 40),

    ('الأطباق الرئيسية', 'كتف الغنم على مهل',
      'كتف غنم مطهو لساعات، دبس رمان، فريكة محمّصة وأعشاب الحديقة.',
      38.00::numeric, '/images/menu/lamb.webp',
      array['كتف غنم', 'دبس رمان', 'فريكة', 'زعتر بري', 'لبن']::text[],
      array['قمح', 'حليب']::text[], true, 'chef_pick'::text, 10),
    ('الأطباق الرئيسية', 'قاروص الفرن بالأعشاب',
      'قاروص كامل مشوي بالفرن، ليمون محفوظ، زيتون أخضر وبقدونس.',
      36.00::numeric, '/images/menu/seabass.webp',
      array['قاروص', 'ليمون محفوظ', 'زيتون أخضر', 'بقدونس', 'زيت زيتون']::text[],
      array['سمك']::text[], false, null::text, 20),
    ('الأطباق الرئيسية', 'دجاج بالسماق والليمون',
      'صدر دجاج طري، سماق، ليمون مشوي وأرز بالأعشاب.',
      28.00::numeric, '/images/menu/grill.webp',
      array['دجاج', 'سماق', 'ليمون', 'أرز', 'بقدونس']::text[],
      array[]::text[], false, 'most_ordered'::text, 30),
    ('الأطباق الرئيسية', 'باذنجان محشو من الفرن',
      'باذنجان مخبوز محشو بالأرز والطماطم والأعشاب مع صلصة لبن.',
      25.00::numeric, '/images/menu/lamb.webp',
      array['باذنجان', 'أرز', 'طماطم', 'أعشاب', 'لبن']::text[],
      array['حليب']::text[], false, 'new'::text, 40),

    ('المشاوي', 'مشاوي أوريليا',
      'كباب لحم متبّل، دجاج مشوي، خضار على الفحم وصلصة طحينة.',
      34.00::numeric, '/images/menu/grill.webp',
      array['لحم بقري', 'دجاج', 'فلفل مشوي', 'طحينة', 'سماق']::text[],
      array['سمسم']::text[], true, 'most_ordered'::text, 10),
    ('المشاوي', 'أخطبوط على الفحم',
      'أخطبوط طري، بطاطا صغيرة، ليمون محروق وزيت بقدونس.',
      32.00::numeric, '/images/menu/octopus.webp',
      array['أخطبوط', 'بطاطا', 'ليمون', 'بقدونس', 'زيت زيتون']::text[],
      array['رخويات']::text[], false, 'chef_pick'::text, 20),
    ('المشاوي', 'أسياخ دجاج وإكليل الجبل',
      'دجاج متبّل ومشوي على الفحم، إكليل الجبل وخضار موسمية.',
      26.00::numeric, '/images/menu/grill.webp',
      array['دجاج', 'إكليل الجبل', 'فلفل', 'بصل', 'زيت زيتون']::text[],
      array[]::text[], false, null::text, 30),
    ('المشاوي', 'كباب حلب بالفستق',
      'كباب لحم على الفحم مع فستق حلبي وبصل مشوي وصلصة لبن.',
      30.00::numeric, '/images/menu/lamb.webp',
      array['لحم بقري', 'فستق حلبي', 'بصل', 'لبن', 'بهارات']::text[],
      array['مكسرات', 'حليب']::text[], false, 'new'::text, 40),

    ('البيتزا', 'بيتزا التين والريكوتا',
      'عجين مخمّر، تين موسمي، ريكوتا كريمية، عسل وإكليل الجبل.',
      21.00::numeric, '/images/menu/pizza.webp',
      array['عجين قمح', 'تين', 'ريكوتا', 'عسل', 'إكليل الجبل']::text[],
      array['قمح', 'حليب']::text[], true, 'new'::text, 10),
    ('البيتزا', 'بيتزا الفطر البري',
      'فطر بري، موزاريلا، زعتر طازج وكريمة ثوم محمّص.',
      22.00::numeric, '/images/menu/mushroom-pizza.webp',
      array['عجين قمح', 'فطر بري', 'موزاريلا', 'ثوم', 'زعتر']::text[],
      array['قمح', 'حليب']::text[], false, 'chef_pick'::text, 20),
    ('البيتزا', 'بيتزا الدجاج والسماق',
      'دجاج متبّل، سماق، بصل أحمر، لبنة مخفوقة وأعشاب.',
      23.00::numeric, '/images/menu/pizza.webp',
      array['عجين قمح', 'دجاج', 'سماق', 'بصل أحمر', 'لبنة']::text[],
      array['قمح', 'حليب']::text[], false, null::text, 30),
    ('البيتزا', 'بيتزا الطماطم والموزاريلا',
      'صلصة طماطم مطهوة، موزاريلا طازجة، ريحان وزيت زيتون.',
      19.00::numeric, '/images/menu/mushroom-pizza.webp',
      array['عجين قمح', 'طماطم', 'موزاريلا', 'ريحان', 'زيت زيتون']::text[],
      array['قمح', 'حليب']::text[], false, 'most_ordered'::text, 40),

    ('المعكرونة', 'تالياتيلي الروبيان والزعفران',
      'معكرونة طازجة، روبيان، زعفران، طماطم كرزية ولمسة كريمة.',
      27.00::numeric, '/images/menu/pasta.webp',
      array['تالياتيلي قمح', 'روبيان', 'زعفران', 'كريمة', 'طماطم']::text[],
      array['قمح', 'قشريات', 'حليب']::text[], true, 'chef_pick'::text, 10),
    ('المعكرونة', 'تالياتيلي الفطر البري',
      'معكرونة طازجة، فطر بري، مريمية مقرمشة وبارميزان معتّق.',
      24.00::numeric, '/images/menu/mushroom-pasta.webp',
      array['تالياتيلي قمح', 'فطر بري', 'مريمية', 'بارميزان', 'زبدة']::text[],
      array['قمح', 'حليب']::text[], false, null::text, 20),
    ('المعكرونة', 'بابارديلي راغو اللحم',
      'معكرونة عريضة مع راغو لحم مطهو ببطء وطماطم وأعشاب.',
      25.00::numeric, '/images/menu/pasta.webp',
      array['بابارديلي قمح', 'لحم بقري', 'طماطم', 'جزر', 'بارميزان']::text[],
      array['قمح', 'حليب']::text[], false, 'most_ordered'::text, 30),
    ('المعكرونة', 'رافيولي الريكوتا والليمون',
      'رافيولي طازج محشو بالريكوتا، زبدة الميرمية وبرش الليمون.',
      23.00::numeric, '/images/menu/mushroom-pasta.webp',
      array['رافيولي قمح', 'ريكوتا', 'زبدة', 'ميرمية', 'ليمون']::text[],
      array['قمح', 'حليب', 'بيض']::text[], false, 'new'::text, 40),

    ('الحلويات', 'ميل فوي الفستق والورد',
      'رقائق مورّقة، كريمة ورد خفيفة، فستق حلبي وتوت أحمر.',
      14.00::numeric, '/images/menu/dessert.webp',
      array['عجينة مورّقة', 'فستق', 'كريمة', 'ماء ورد', 'توت']::text[],
      array['قمح', 'مكسرات', 'حليب']::text[], true, 'most_ordered'::text, 10),
    ('الحلويات', 'تشيزكيك زهر البرتقال',
      'تشيزكيك مخبوز، زهر برتقال، قشرة بسكويت وكمبوت حمضيات.',
      13.00::numeric, '/images/menu/cheesecake.webp',
      array['جبن كريمي', 'زهر البرتقال', 'بيض', 'بسكويت قمح', 'برتقال']::text[],
      array['حليب', 'بيض', 'قمح']::text[], false, null::text, 20),
    ('الحلويات', 'كنافة الفستق',
      'كنافة ساخنة، فستق حلبي، قطر خفيف وقشطة طازجة.',
      15.00::numeric, '/images/menu/dessert.webp',
      array['عجينة كنافة', 'فستق حلبي', 'قشطة', 'قطر']::text[],
      array['قمح', 'مكسرات', 'حليب']::text[], false, 'chef_pick'::text, 30),
    ('الحلويات', 'كيكة البرتقال وزيت الزيتون',
      'كيكة طرية بالبرتقال وزيت الزيتون مع كريمة فانيلا خفيفة.',
      12.00::numeric, '/images/menu/cheesecake.webp',
      array['برتقال', 'زيت زيتون', 'بيض', 'طحين قمح', 'فانيلا']::text[],
      array['بيض', 'قمح', 'حليب']::text[], false, 'new'::text, 40),

    ('المشروبات', 'سبريتز الرمان والبرتقال',
      'رمان حامض، برتقال طازج، ماء فوار وإكليل الجبل.',
      10.00::numeric, '/images/menu/drinks.webp',
      array['رمان', 'برتقال', 'ماء فوار', 'إكليل الجبل']::text[],
      array[]::text[], true, 'most_ordered'::text, 10),
    ('المشروبات', 'ليموناضة اللافندر',
      'ليمون طازج، شراب لافندر عطري ونعناع محضّر يومياً.',
      8.00::numeric, '/images/menu/lemonade.webp',
      array['ليمون', 'لافندر', 'نعناع', 'ماء']::text[],
      array[]::text[], false, null::text, 20),
    ('المشروبات', 'عيران النعناع والليمون',
      'لبن بارد مخفوق مع نعناع طازج ولمسة ليمون.',
      7.00::numeric, '/images/menu/drinks.webp',
      array['لبن', 'نعناع', 'ليمون', 'ملح']::text[],
      array['حليب']::text[], false, 'new'::text, 30),
    ('المشروبات', 'شاي الكركديه البارد',
      'كركديه منقوع على مهل، برتقال، ماء ورد ولمسة عسل.',
      8.00::numeric, '/images/menu/lemonade.webp',
      array['كركديه', 'برتقال', 'ماء ورد', 'عسل']::text[],
      array[]::text[], false, null::text, 40)
) as seed(
  category_name, name, description, price, image_url, ingredients, allergens,
  is_featured, badge, display_order
)
join public.menu_categories c
  on c.restaurant_id = r.id
 and c.name = seed.category_name
where r.slug = 'aurelia'
  and not exists (
    select 1
    from public.menu_items existing
    where existing.restaurant_id = r.id
      and existing.category_id = c.id
      and existing.name = seed.name
  )
on conflict do nothing;

-- Pizza sizes use a modifier relative to the base item price.
insert into public.menu_item_options (
  restaurant_id, menu_item_id, name, selection_type, required,
  max_selections, display_order
)
select i.restaurant_id, i.id, seed.option_name, seed.selection_type,
       seed.required, seed.max_selections, seed.display_order
from public.menu_items i
join public.restaurants r on r.id = i.restaurant_id
join (
  values
    ('بيتزا التين والريكوتا', 'الحجم', 'single', true, 1, 10),
    ('بيتزا الفطر البري', 'الحجم', 'single', true, 1, 10),
    ('بيتزا التين والريكوتا', 'الإضافات', 'multiple', false, 3, 20),
    ('بيتزا الفطر البري', 'الإضافات', 'multiple', false, 3, 20),
    ('قاروص الفرن بالأعشاب', 'حجم الحصة', 'single', true, 1, 10)
) as seed(item_name, option_name, selection_type, required, max_selections, display_order)
  on seed.item_name = i.name
where r.slug = 'aurelia'
on conflict (restaurant_id, menu_item_id, name) do nothing;

insert into public.menu_item_option_values (
  restaurant_id, option_id, name, price_modifier, display_order
)
select o.restaurant_id, o.id, seed.value_name, seed.price_modifier, seed.display_order
from public.menu_item_options o
join public.menu_items i
  on i.restaurant_id = o.restaurant_id and i.id = o.menu_item_id
join public.restaurants r on r.id = i.restaurant_id
join (
  values
    ('بيتزا التين والريكوتا', 'الحجم', 'صغير', -5.00::numeric, 10),
    ('بيتزا التين والريكوتا', 'الحجم', 'وسط', 0.00::numeric, 20),
    ('بيتزا التين والريكوتا', 'الحجم', 'كبير', 6.00::numeric, 30),
    ('بيتزا الفطر البري', 'الحجم', 'صغير', -5.00::numeric, 10),
    ('بيتزا الفطر البري', 'الحجم', 'وسط', 0.00::numeric, 20),
    ('بيتزا الفطر البري', 'الحجم', 'كبير', 6.00::numeric, 30),
    ('بيتزا التين والريكوتا', 'الإضافات', 'جبنة إضافية', 3.00::numeric, 10),
    ('بيتزا التين والريكوتا', 'الإضافات', 'دجاج إضافي', 5.00::numeric, 20),
    ('بيتزا التين والريكوتا', 'الإضافات', 'صوص خاص', 2.00::numeric, 30),
    ('بيتزا الفطر البري', 'الإضافات', 'جبنة إضافية', 3.00::numeric, 10),
    ('بيتزا الفطر البري', 'الإضافات', 'دجاج إضافي', 5.00::numeric, 20),
    ('بيتزا الفطر البري', 'الإضافات', 'صوص خاص', 2.00::numeric, 30),
    ('قاروص الفرن بالأعشاب', 'حجم الحصة', 'حصة فردية', 0.00::numeric, 10),
    ('قاروص الفرن بالأعشاب', 'حجم الحصة', 'حصة للمشاركة', 26.00::numeric, 20)
) as seed(item_name, option_name, value_name, price_modifier, display_order)
  on seed.item_name = i.name and seed.option_name = o.name
where r.slug = 'aurelia'
on conflict (option_id, name) do nothing;

commit;