import { getProfileSettings } from './supabase-profile';
import type {
  MenuCategory,
  MenuDish,
  MenuOption,
  MenuOptionValue,
  PublicMenu,
} from '../pages/menu-data';

const menuSelect = [
  'id,',
  'menu_categories(',
  'id,name,description,display_order,is_active,',
  'menu_items(',
  'id,category_id,name,description,price,image_url,ingredients,allergens,',
  'is_available,is_featured,badge,display_order,',
  'menu_item_options(',
  'id,name,required,selection_type,max_selections,display_order,',
  'menu_item_option_values(id,name,price_modifier,display_order,is_available)',
  ')',
  ')',
  ')',
].join('');

const FALLBACK_MENU_IMAGE = '/images/menu/mezze.webp';
const CACHE_TTL_MS = 45_000;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${label} response.`);
  }
  return value as JsonRecord;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label} response.`);
  return value;
}

function readString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${key} in menu response.`);
  }
  return value.trim();
}

function readNullableString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Invalid ${key} in menu response.`);
  return value.trim() || null;
}

function readNumber(record: JsonRecord, key: string): number {
  const value = record[key];
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${key} in menu response.`);
  return parsed;
}

function readBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') throw new Error(`Invalid ${key} in menu response.`);
  return value;
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid ${key} in menu response.`);
  }
  return value.map((entry) => (entry as string).trim()).filter(Boolean);
}

function safeMenuImage(value: string | null): string {
  if (!value) return FALLBACK_MENU_IMAGE;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('images/')) return `/${value}`;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : FALLBACK_MENU_IMAGE;
  } catch {
    return FALLBACK_MENU_IMAGE;
  }
}

function translateBadge(value: string | null): string | null {
  if (!value) return null;
  const labels: Record<string, string> = {
    most_ordered: 'الأكثر طلباً',
    new: 'جديد',
    chef_pick: 'اختيار الشيف',
  };
  return labels[value] ?? value;
}

function parseOptionValue(value: unknown): MenuOptionValue | null {
  const row = asRecord(value, 'menu option value');
  if (row.is_available === false) return null;
  if (row.is_available !== true) throw new Error('Invalid menu option availability.');
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    priceModifier: readNumber(row, 'price_modifier'),
    displayOrder: readNumber(row, 'display_order'),
  };
}

function parseOption(value: unknown): MenuOption {
  const row = asRecord(value, 'menu option');
  const selectionType = readString(row, 'selection_type');
  if (selectionType !== 'single' && selectionType !== 'multiple') {
    throw new Error('Invalid menu option selection type.');
  }
  const values = asArray(row.menu_item_option_values, 'menu option values')
    .map(parseOptionValue)
    .filter((entry): entry is MenuOptionValue => entry !== null)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    required: readBoolean(row, 'required'),
    selectionType,
    maxSelections: Math.max(1, Math.floor(readNumber(row, 'max_selections'))),
    displayOrder: readNumber(row, 'display_order'),
    values,
  };
}

function parseDish(value: unknown, categoryId: string): MenuDish {
  const row = asRecord(value, 'menu item');
  if (readString(row, 'category_id') !== categoryId) {
    throw new Error('Menu item category did not match its parent category.');
  }
  const price = readNumber(row, 'price');
  const isFeatured = readBoolean(row, 'is_featured');
  const badge = translateBadge(readNullableString(row, 'badge'));
  const badges = [...new Set([
    ...(isFeatured ? ['مميّز'] : []),
    ...(badge ? [badge] : []),
  ])];
  const options = asArray(row.menu_item_options, 'menu item options')
    .map(parseOption)
    .sort((left, right) => left.displayOrder - right.displayOrder);

  if (price < 0) throw new Error('Menu item price cannot be negative.');

  return {
    id: readString(row, 'id'),
    categoryId,
    name: readString(row, 'name'),
    description: readString(row, 'description'),
    ingredients: readStringArray(row, 'ingredients'),
    allergens: readStringArray(row, 'allergens'),
    price,
    image: safeMenuImage(readNullableString(row, 'image_url')),
    isAvailable: readBoolean(row, 'is_available'),
    isFeatured,
    badge,
    badges,
    displayOrder: readNumber(row, 'display_order'),
    options,
  };
}

function parseCategory(value: unknown): { category: MenuCategory; dishes: MenuDish[] } {
  const row = asRecord(value, 'menu category');
  const id = readString(row, 'id');
  const isActive = readBoolean(row, 'is_active');
  const dishes = isActive
    ? asArray(row.menu_items, 'menu items')
      .map((item) => parseDish(item, id))
      .sort((left, right) => left.displayOrder - right.displayOrder)
    : [];

  return {
    category: {
      id,
      name: readString(row, 'name'),
      description: readNullableString(row, 'description') ?? '',
      displayOrder: readNumber(row, 'display_order'),
      isActive,
    },
    dishes,
  };
}

async function requestPublicMenu(): Promise<PublicMenu> {
  const settings = getProfileSettings();
  if (!settings.url || !settings.anonKey) {
    throw new Error('Supabase menu settings are incomplete.');
  }

  let projectUrl: URL;
  try {
    projectUrl = new URL(settings.url);
  } catch {
    throw new Error('The Supabase project URL is invalid.');
  }
  if (projectUrl.protocol !== 'https:' && projectUrl.protocol !== 'http:') {
    throw new Error('The Supabase project URL must use HTTP or HTTPS.');
  }

  const endpoint = new URL('/rest/v1/restaurants', projectUrl);
  const params = new URLSearchParams({
    select: menuSelect,
    slug: `eq.${settings.slug}`,
    is_published: 'eq.true',
    limit: '1',
  });
  const response = await fetch(`${endpoint}?${params.toString()}`, {
    method: 'GET',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let detail = errorBody.trim();
    try {
      const payload = JSON.parse(errorBody) as Record<string, unknown>;
      const messages = [payload.message, payload.details, payload.hint]
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));
      if (messages.length) detail = messages.join(' — ');
    } catch {
      // Keep the raw response text when Supabase doesn't return JSON.
    }
    throw new Error(
      `Supabase menu request failed with HTTP ${response.status}${detail ? `: ${detail}` : '.'}`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Supabase returned invalid menu JSON.');
  }
  const restaurants = asArray(payload, 'restaurant');
  if (restaurants.length > 1) throw new Error('Supabase returned duplicate restaurant slugs.');
  if (!restaurants.length) {
    if (import.meta.env.DEV) {
      console.warn(
        `[public-menu] No visible published restaurant row found for slug "${settings.slug}".`,
      );
    }
    return { categories: [], dishes: [] };
  }

  const restaurant = asRecord(restaurants[0], 'restaurant');
  const categoryRows = asArray(restaurant.menu_categories, 'menu categories');
  if (import.meta.env.DEV) {
    const itemCount = categoryRows.reduce((count, value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return count;
      const items = (value as JsonRecord).menu_items;
      return count + (Array.isArray(items) ? items.length : 0);
    }, 0);
    console.info('[public-menu] Supabase response rows', {
      slug: settings.slug,
      categories: categoryRows.length,
      items: itemCount,
    });
  }
  const parsed = categoryRows
    .map(parseCategory)
    .filter((entry) => entry.category.isActive)
    .sort((left, right) => left.category.displayOrder - right.category.displayOrder);

  return {
    categories: parsed.map((entry) => entry.category),
    dishes: parsed.flatMap((entry) => entry.dishes),
  };
}

let cachedMenu: { fetchedAt: number; value: PublicMenu } | null = null;
let inFlightRequest: Promise<PublicMenu> | null = null;

export function fetchPublicMenu(forceRefresh = false): Promise<PublicMenu> {
  if (forceRefresh) cachedMenu = null;
  if (cachedMenu && Date.now() - cachedMenu.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cachedMenu.value);
  }
  if (inFlightRequest) return inFlightRequest;

  const request = requestPublicMenu()
    .then((value) => {
      cachedMenu = { fetchedAt: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (inFlightRequest === request) inFlightRequest = null;
    });
  inFlightRequest = request;
  return request;
}