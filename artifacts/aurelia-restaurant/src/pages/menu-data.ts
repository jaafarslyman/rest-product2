export type MenuCategory = {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
};

export type MenuOptionValue = {
  id: string;
  name: string;
  priceModifier: number;
  displayOrder: number;
};

export type MenuOption = {
  id: string;
  name: string;
  required: boolean;
  selectionType: 'single' | 'multiple';
  maxSelections: number;
  displayOrder: number;
  values: MenuOptionValue[];
};

export type MenuOptionSelection = {
  optionId: string;
  optionName: string;
  valueId: string;
  valueName: string;
  priceModifier: number;
};

export type MenuDish = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  price: number;
  image: string;
  isAvailable: boolean;
  isFeatured: boolean;
  badge: string | null;
  badges: string[];
  displayOrder: number;
  options: MenuOption[];
};

export type PublicMenu = {
  categories: MenuCategory[];
  dishes: MenuDish[];
};

export const formatPrice = (price: number) =>
  `${price.toLocaleString('ar', { maximumFractionDigits: 2 })} $`;

export const normalizeArabic = (value: string) =>
  value
    .toLocaleLowerCase('ar')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();