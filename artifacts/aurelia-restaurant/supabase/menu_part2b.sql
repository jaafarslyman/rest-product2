-- AURELIA — customer menu schema for Part 2B
-- Run restaurants.sql first. This migration is deliberately not connected to
-- the Part 2A menu UI. Public roles receive read-only access to published data.
begin;

-- Keep update timestamps current for later trusted-server edits.
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
  slug text not null check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_categories_restaurant_slug_unique
    unique (restaurant_id, slug),
  constraint menu_categories_restaurant_id_unique
    unique (restaurant_id, id)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  slug text not null check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  description text not null check (length(trim(description)) > 0),
  ingredients text[] not null default '{}'::text[],
  allergens text[] not null default '{}'::text[],
  price numeric(10, 2) not null check (price >= 0),
  currency_code text not null default 'USD'
    check (currency_code ~ '^[A-Z]{3}$'),
  image_path text,
  badge text check (badge in ('most_ordered', 'new', 'chef_pick')),
  is_available boolean not null default true,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  option_type text not null check (option_type in ('single', 'multiple')),
  is_required boolean not null default false,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_options_selection_range_check
    check (
      min_selections <= max_selections
      and (
        (option_type = 'single' and max_selections = 1)
        or option_type = 'multiple'
      )
    ),
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
  price_delta numeric(10, 2) not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_option_values_option_name_unique
    unique (option_id, name),
  constraint menu_item_option_values_option_same_restaurant_fk
    foreign key (restaurant_id, option_id)
    references public.menu_item_options(restaurant_id, id)
    on delete cascade
);

create index if not exists menu_categories_public_order_idx
  on public.menu_categories (restaurant_id, is_active, sort_order);
create index if not exists menu_items_public_category_order_idx
  on public.menu_items (
    restaurant_id, category_id, is_published, is_available, sort_order
  );
create index if not exists menu_item_options_item_order_idx
  on public.menu_item_options (restaurant_id, menu_item_id, sort_order);
create index if not exists menu_item_option_values_option_order_idx
  on public.menu_item_option_values (restaurant_id, option_id, sort_order);

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

grant usage on schema public to anon, authenticated;
revoke all on table public.menu_categories from anon, authenticated;
revoke all on table public.menu_items from anon, authenticated;
revoke all on table public.menu_item_options from anon, authenticated;
revoke all on table public.menu_item_option_values from anon, authenticated;
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

drop policy if exists "Public can read published available menu items"
  on public.menu_items;
create policy "Public can read published available menu items"
  on public.menu_items
  for select to anon, authenticated
  using (
    is_published
    and is_available
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

drop policy if exists "Public can read options for public menu items"
  on public.menu_item_options;
create policy "Public can read options for public menu items"
  on public.menu_item_options
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.menu_items i
      where i.id = menu_item_options.menu_item_id
        and i.restaurant_id = menu_item_options.restaurant_id
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
      where o.id = menu_item_option_values.option_id
        and o.restaurant_id = menu_item_option_values.restaurant_id
    )
  );

-- Read-only AURELIA sample data. If Part 1 has no AURELIA row yet, add an
-- unpublished placeholder. An existing profile is never overwritten.
insert into public.restaurants (name, slug, description, is_published)
values (
  'AURELIA',
  'aurelia',
  'نكهات من ضفّتَي المتوسط، وموسم يكتب فصله كل يوم.',
  false
)
on conflict (slug) do nothing;

insert into public.menu_categories
  (restaurant_id, name, slug, description, sort_order, is_active)
select r.id, seed.name, seed.slug, seed.description, seed.sort_order, true
from public.restaurants r
cross join (
  values
    ('المقبلات', 'appetizers', 'لقيمات أولى تفتح حكاية المائدة.', 10),
    ('السلطات', 'salads', 'خضرة موسمية ونكهات من الحديقة.', 20),
    ('الأطباق الرئيسية', 'mains', 'أطباق دافئة تُحضّر على مهل.', 30),
    ('المشاوي', 'grills', 'نكهة الفحم والأعشاب الطازجة.', 40),
    ('البيتزا', 'pizza', 'عجين مخمّر وخَبز على نار الحطب.', 50),
    ('المعكرونة', 'pasta', 'عجين طازج وصلصات متوسطية.', 60),
    ('الحلويات', 'desserts', 'ختام حلو بلمسة أوريليا.', 70),
    ('المشروبات', 'drinks', 'رشفات باردة من الفاكهة والأعشاب.', 80)
) as seed(name, slug, description, sort_order)
where r.slug = 'aurelia'
on conflict (restaurant_id, slug) do nothing;

insert into public.menu_items (
  restaurant_id, category_id, name, slug, description, ingredients,
  allergens, price, currency_code, image_path, badge,
  is_available, is_published, sort_order
)
select
  r.id,
  c.id,
  seed.name,
  seed.slug,
  seed.description,
  seed.ingredients,
  seed.allergens,
  seed.price,
  'USD',
  seed.image_path,
  seed.badge,
  true,
  true,
  seed.sort_order
from public.restaurants r
join (
  values
    (
      'المقبلات', 'حمّص أوريليا', 'hummus-aurelia',
      'حمّص مخملي، زيت زيتون بكر، حمص مقرمش وخبز تنور دافئ.',
      array['حمّص', 'طحينة', 'ليمون', 'زيت زيتون', 'سماق']::text[],
      array['سمسم', 'قمح']::text[], 12.00::numeric,
      '/images/menu/mezze.webp', 'most_ordered'::text, 10
    ),
    (
      'المقبلات', 'حلّوم مقرمش', 'crispy-halloumi',
      'أصابع حلّوم ذهبية، عسل زعتر، رمان طازج ونعناع.',
      array['جبن حلّوم', 'عسل', 'زعتر', 'رمان', 'نعناع']::text[],
      array['حليب']::text[], 16.00::numeric,
      '/images/menu/halloumi.webp', null::text, 20
    ),
    (
      'السلطات', 'سلطة الحديقة', 'garden-salad',
      'طماطم ناضجة، خيار، أعشاب طازجة، زيتون وزيت زيتون ليموني.',
      array['طماطم', 'خيار', 'بقدونس', 'نعناع', 'زيتون', 'ليمون']::text[],
      array[]::text[], 15.00::numeric,
      '/images/menu/salad.webp', null::text, 10
    ),
    (
      'السلطات', 'شمندر ولبنة', 'beet-labneh',
      'شمندر مشوي، لبنة مخفوقة، جوز محمّص ودبس رمان.',
      array['شمندر', 'لبنة', 'جوز', 'دبس رمان', 'شبت']::text[],
      array['حليب', 'مكسرات']::text[], 17.00::numeric,
      '/images/menu/beet-salad.webp', null::text, 20
    ),
    (
      'الأطباق الرئيسية', 'كتف الغنم على مهل', 'slow-lamb-shoulder',
      'كتف غنم مطهو لساعات، دبس رمان، فريكة محمّصة وأعشاب الحديقة.',
      array['كتف غنم', 'دبس رمان', 'فريكة', 'زعتر بري', 'لبن']::text[],
      array['قمح', 'حليب']::text[], 38.00::numeric,
      '/images/menu/lamb.webp', 'chef_pick'::text, 10
    ),
    (
      'الأطباق الرئيسية', 'قاروص الفرن بالأعشاب', 'baked-sea-bass',
      'قاروص كامل مشوي بالفرن، ليمون محفوظ، زيتون أخضر وبقدونس.',
      array['قاروص', 'ليمون محفوظ', 'زيتون أخضر', 'بقدونس', 'زيت زيتون']::text[],
      array['سمك']::text[], 36.00::numeric,
      '/images/menu/seabass.webp', null::text, 20
    ),
    (
      'المشاوي', 'مشاوي أوريليا', 'aurelia-grill',
      'كباب لحم متبّل، دجاج مشوي، خضار على الفحم وصلصة طحينة.',
      array['لحم بقري', 'دجاج', 'فلفل مشوي', 'طحينة', 'سماق']::text[],
      array['سمسم']::text[], 34.00::numeric,
      '/images/menu/grill.webp', 'most_ordered'::text, 10
    ),
    (
      'المشاوي', 'أخطبوط على الفحم', 'charcoal-octopus',
      'أخطبوط طري، بطاطا صغيرة، ليمون محروق وزيت بقدونس.',
      array['أخطبوط', 'بطاطا', 'ليمون', 'بقدونس', 'زيت زيتون']::text[],
      array['رخويات']::text[], 32.00::numeric,
      '/images/menu/octopus.webp', null::text, 20
    ),
    (
      'البيتزا', 'بيتزا التين والريكوتا', 'fig-ricotta-pizza',
      'عجين مخمّر، تين موسمي، ريكوتا كريمية، عسل وإكليل الجبل.',
      array['عجين قمح', 'تين', 'ريكوتا', 'عسل', 'إكليل الجبل']::text[],
      array['قمح', 'حليب']::text[], 21.00::numeric,
      '/images/menu/pizza.webp', 'new'::text, 10
    ),
    (
      'البيتزا', 'بيتزا الفطر البري', 'wild-mushroom-pizza',
      'فطر بري، موزاريلا، زعتر طازج وكريمة ثوم محمّص.',
      array['عجين قمح', 'فطر بري', 'موزاريلا', 'ثوم', 'زعتر']::text[],
      array['قمح', 'حليب']::text[], 22.00::numeric,
      '/images/menu/mushroom-pizza.webp', null::text, 20
    ),
    (
      'المعكرونة', 'تالياتيلي الروبيان والزعفران',
      'saffron-prawn-tagliatelle',
      'معكرونة طازجة، روبيان، زعفران، طماطم كرزية ولمسة كريمة.',
      array['تالياتيلي قمح', 'روبيان', 'زعفران', 'كريمة', 'طماطم']::text[],
      array['قمح', 'قشريات', 'حليب']::text[], 27.00::numeric,
      '/images/menu/pasta.webp', 'chef_pick'::text, 10
    ),
    (
      'المعكرونة', 'تالياتيلي الفطر البري',
      'wild-mushroom-tagliatelle',
      'معكرونة طازجة، فطر بري، مريمية مقرمشة وبارميزان معتّق.',
      array['تالياتيلي قمح', 'فطر بري', 'مريمية', 'بارميزان', 'زبدة']::text[],
      array['قمح', 'حليب']::text[], 24.00::numeric,
      '/images/menu/mushroom-pasta.webp', null::text, 20
    ),
    (
      'الحلويات', 'ميل فوي الفستق والورد',
      'pistachio-rose-mille-feuille',
      'رقائق مورّقة، كريمة ورد خفيفة، فستق حلبي وتوت أحمر.',
      array['عجينة مورّقة', 'فستق', 'كريمة', 'ماء ورد', 'توت']::text[],
      array['قمح', 'مكسرات', 'حليب']::text[], 14.00::numeric,
      '/images/menu/dessert.webp', 'most_ordered'::text, 10
    ),
    (
      'الحلويات', 'تشيزكيك زهر البرتقال',
      'orange-blossom-cheesecake',
      'تشيزكيك مخبوز، زهر برتقال، قشرة بسكويت وكمبوت حمضيات.',
      array['جبن كريمي', 'زهر البرتقال', 'بيض', 'بسكويت قمح', 'برتقال']::text[],
      array['حليب', 'بيض', 'قمح']::text[], 13.00::numeric,
      '/images/menu/cheesecake.webp', null::text, 20
    ),
    (
      'المشروبات', 'سبريتز الرمان والبرتقال',
      'pomegranate-orange-spritz',
      'رمان حامض، برتقال طازج، ماء فوار وإكليل الجبل.',
      array['رمان', 'برتقال', 'ماء فوار', 'إكليل الجبل']::text[],
      array[]::text[], 10.00::numeric,
      '/images/menu/drinks.webp', null::text, 10
    ),
    (
      'المشروبات', 'ليموناضة اللافندر',
      'lavender-lemonade',
      'ليمون طازج، شراب لافندر عطري ونعناع محضّر يومياً.',
      array['ليمون', 'لافندر', 'نعناع', 'ماء']::text[],
      array[]::text[], 8.00::numeric,
      '/images/menu/lemonade.webp', null::text, 20
    )
) as seed(
  category_name, name, slug, description, ingredients, allergens,
  price, image_path, badge, sort_order
) on true
join public.menu_categories c
  on c.restaurant_id = r.id
 and c.name = seed.category_name
where r.slug = 'aurelia'
on conflict (restaurant_id, slug) do nothing;

-- Configurable sizes for both sample pizzas. price_delta is relative to the
-- menu item base price: for example, a -5 delta makes the first pizza $16.
insert into public.menu_item_options (
  restaurant_id, menu_item_id, name, option_type, is_required,
  min_selections, max_selections, sort_order
)
select i.restaurant_id, i.id, 'الحجم', 'single', true, 1, 1, 10
from public.menu_items i
join public.restaurants r on r.id = i.restaurant_id
where r.slug = 'aurelia'
  and i.slug in ('fig-ricotta-pizza', 'wild-mushroom-pizza')
on conflict (restaurant_id, menu_item_id, name) do nothing;

insert into public.menu_item_option_values (
  restaurant_id, option_id, name, price_delta, sort_order
)
select o.restaurant_id, o.id, seed.name, seed.price_delta, seed.sort_order
from public.menu_item_options o
join public.menu_items i
  on i.restaurant_id = o.restaurant_id and i.id = o.menu_item_id
join public.restaurants r on r.id = i.restaurant_id
cross join (
  values
    ('صغير', -5.00::numeric, 10),
    ('وسط', 0.00::numeric, 20),
    ('كبير', 6.00::numeric, 30)
) as seed(name, price_delta, sort_order)
where r.slug = 'aurelia'
  and i.slug in ('fig-ricotta-pizza', 'wild-mushroom-pizza')
  and o.name = 'الحجم'
on conflict (option_id, name) do nothing;

insert into public.menu_item_options (
  restaurant_id, menu_item_id, name, option_type, is_required,
  min_selections, max_selections, sort_order
)
select i.restaurant_id, i.id, 'الإضافات', 'multiple', false, 0, 3, 20
from public.menu_items i
join public.restaurants r on r.id = i.restaurant_id
where r.slug = 'aurelia'
  and i.slug in ('fig-ricotta-pizza', 'wild-mushroom-pizza')
on conflict (restaurant_id, menu_item_id, name) do nothing;

insert into public.menu_item_option_values (
  restaurant_id, option_id, name, price_delta, sort_order
)
select o.restaurant_id, o.id, seed.name, seed.price_delta, seed.sort_order
from public.menu_item_options o
join public.menu_items i
  on i.restaurant_id = o.restaurant_id and i.id = o.menu_item_id
join public.restaurants r on r.id = i.restaurant_id
cross join (
  values
    ('جبنة إضافية', 3.00::numeric, 10),
    ('صوص', 2.00::numeric, 20),
    ('دجاج إضافي', 5.00::numeric, 30)
) as seed(name, price_delta, sort_order)
where r.slug = 'aurelia'
  and i.slug in ('fig-ricotta-pizza', 'wild-mushroom-pizza')
  and o.name = 'الإضافات'
on conflict (option_id, name) do nothing;

-- Serving-size choices for the individual/sharing sea bass plate.
insert into public.menu_item_options (
  restaurant_id, menu_item_id, name, option_type, is_required,
  min_selections, max_selections, sort_order
)
select i.restaurant_id, i.id, 'حجم الحصة', 'single', true, 1, 1, 10
from public.menu_items i
join public.restaurants r on r.id = i.restaurant_id
where r.slug = 'aurelia' and i.slug = 'baked-sea-bass'
on conflict (restaurant_id, menu_item_id, name) do nothing;

insert into public.menu_item_option_values (
  restaurant_id, option_id, name, price_delta, sort_order
)
select o.restaurant_id, o.id, seed.name, seed.price_delta, seed.sort_order
from public.menu_item_options o
join public.menu_items i
  on i.restaurant_id = o.restaurant_id and i.id = o.menu_item_id
join public.restaurants r on r.id = i.restaurant_id
cross join (
  values
    ('حصة فردية', 0.00::numeric, 10),
    ('حصة للمشاركة', 26.00::numeric, 20)
) as seed(name, price_delta, sort_order)
where r.slug = 'aurelia'
  and i.slug = 'baked-sea-bass'
  and o.name = 'حجم الحصة'
on conflict (option_id, name) do nothing;

commit;