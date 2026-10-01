const profileColumns = [
  'name',
  'slug',
  'description',
  'cover_image_path',
  'gallery_image_paths',
  'address',
  'phone',
  'opening_hours',
  'social_links',
].join(',');

export interface RestaurantProfile {
  name: string;
  slug: string;
  description: string | null;
  cover_image_path: string | null;
  gallery_image_paths: string[];
  address: string | null;
  phone: string | null;
  opening_hours: Record<string, unknown> | null;
  social_links: Record<string, unknown>;
}

export interface ProfileSettings {
  url: string;
  anonKey: string;
  slug: string;
}

export function getProfileSettings(): ProfileSettings {
  return {
    url: import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '') ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
    slug: import.meta.env.VITE_RESTAURANT_SLUG?.trim() || 'aurelia',
  };
}

export function getPublicImageUrl(
  path: string | null | undefined,
  fallback: string,
): string {
  const value = path?.trim();
  if (!value) return fallback;

  if (value.startsWith('/')) return value;
  if (value.startsWith('images/')) return `/${value}`;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

export function getSafeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const weekdayNames: Record<string, string> = {
  sun: 'الأحد',
  sunday: 'الأحد',
  mon: 'الاثنين',
  monday: 'الاثنين',
  tue: 'الثلاثاء',
  tuesday: 'الثلاثاء',
  wed: 'الأربعاء',
  wednesday: 'الأربعاء',
  thu: 'الخميس',
  thursday: 'الخميس',
  fri: 'الجمعة',
  friday: 'الجمعة',
  sat: 'السبت',
  saturday: 'السبت',
  daily: 'يومياً',
};

export function formatOpeningHours(
  value: Record<string, unknown> | null | undefined,
): string | null {
  if (!value) return null;

  const lines = Object.entries(value).flatMap(([key, hours]) => {
    const label = weekdayNames[key.toLowerCase()] ?? key;
    if (typeof hours === 'string' && hours.trim()) {
      return [`${label}: ${hours.trim()}`];
    }

    if (
      hours &&
      typeof hours === 'object' &&
      !Array.isArray(hours) &&
      'open' in hours &&
      'close' in hours
    ) {
      const entry = hours as { open: unknown; close: unknown };
      if (typeof entry.open === 'string' && typeof entry.close === 'string') {
        return [`${label}: ${entry.open} – ${entry.close}`];
      }
    }

    return [];
  });

  return lines.length ? lines.join(' · ') : null;
}

export async function fetchPublishedRestaurant(
  settings: ProfileSettings,
): Promise<RestaurantProfile | null> {
  const projectUrl = new URL(settings.url);
  if (projectUrl.protocol !== 'https:' && projectUrl.protocol !== 'http:') {
    throw new Error('The Supabase URL must use HTTP or HTTPS.');
  }

  const query = new URLSearchParams({
    select: profileColumns,
    slug: `eq.${settings.slug}`,
    is_published: 'eq.true',
    limit: '1',
  });

  const response = await fetch(
    `${settings.url}/rest/v1/restaurants?${query.toString()}`,
    {
      headers: {
        apikey: settings.anonKey,
        Authorization: `Bearer ${settings.anonKey}`,
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase returned HTTP ${response.status}.`);
  }

  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error('Supabase returned an unexpected restaurant response.');
  }

  const row = rows[0];
  if (!row) return null;
  if (typeof row !== 'object' || row === null) {
    throw new Error('Supabase returned an invalid restaurant profile.');
  }

  const profile = row as Partial<RestaurantProfile>;
  if (typeof profile.name !== 'string' || typeof profile.slug !== 'string') {
    throw new Error('The published restaurant profile is missing its name or slug.');
  }

  return {
    name: profile.name,
    slug: profile.slug,
    description:
      typeof profile.description === 'string' ? profile.description : null,
    cover_image_path:
      typeof profile.cover_image_path === 'string'
        ? profile.cover_image_path
        : null,
    gallery_image_paths: Array.isArray(profile.gallery_image_paths)
      ? profile.gallery_image_paths.filter(
          (path): path is string => typeof path === 'string',
        )
      : [],
    address: typeof profile.address === 'string' ? profile.address : null,
    phone: typeof profile.phone === 'string' ? profile.phone : null,
    opening_hours:
      profile.opening_hours &&
      typeof profile.opening_hours === 'object' &&
      !Array.isArray(profile.opening_hours)
        ? profile.opening_hours
        : null,
    social_links:
      profile.social_links &&
      typeof profile.social_links === 'object' &&
      !Array.isArray(profile.social_links)
        ? profile.social_links
        : {},
  };
}