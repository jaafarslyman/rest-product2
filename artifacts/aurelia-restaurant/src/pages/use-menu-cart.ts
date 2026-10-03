import { useEffect, useState } from 'react';
import type { MenuDish, MenuOptionSelection } from './menu-data';

export type CartLine = {
  key: string;
  dishId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selections: MenuOptionSelection[];
};

type LegacyPriceOption = { id: string; name: string; price: number };
type LegacyCartLine = {
  key: string;
  dishId: string;
  name: string;
  basePrice: number;
  quantity: number;
  size?: LegacyPriceOption;
  addons: LegacyPriceOption[];
};

const STORAGE_KEY = 'aurelia-menu-cart-v2';
const LEGACY_STORAGE_KEY = 'aurelia-menu-cart-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPriceOption(value: unknown): value is LegacyPriceOption {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.price === 'number'
    && Number.isFinite(value.price)
    && value.price >= 0;
}

function isLegacyCartLine(value: unknown): value is LegacyCartLine {
  if (!isRecord(value)) return false;
  return typeof value.key === 'string'
    && typeof value.dishId === 'string'
    && typeof value.name === 'string'
    && typeof value.basePrice === 'number'
    && Number.isFinite(value.basePrice)
    && value.basePrice >= 0
    && typeof value.quantity === 'number'
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && Array.isArray(value.addons)
    && value.addons.every(isPriceOption)
    && (value.size === undefined || isPriceOption(value.size));
}

function isSelection(value: unknown): value is MenuOptionSelection {
  if (!isRecord(value)) return false;
  return typeof value.optionId === 'string'
    && typeof value.optionName === 'string'
    && typeof value.valueId === 'string'
    && typeof value.valueName === 'string'
    && typeof value.priceModifier === 'number'
    && Number.isFinite(value.priceModifier);
}

function isCartLine(value: unknown): value is CartLine {
  if (!isRecord(value)) return false;
  return typeof value.key === 'string'
    && value.key.length > 0
    && typeof value.dishId === 'string'
    && typeof value.name === 'string'
    && typeof value.basePrice === 'number'
    && Number.isFinite(value.basePrice)
    && value.basePrice >= 0
    && typeof value.quantity === 'number'
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && Array.isArray(value.selections)
    && value.selections.every(isSelection);
}

function migrateLegacyLine(value: unknown): CartLine | null {
  if (!isLegacyCartLine(value)) return null;
  const selections: MenuOptionSelection[] = [];
  if (value.size) {
    selections.push({
      optionId: `legacy-size-${value.dishId}`,
      optionName: 'الحجم',
      valueId: value.size.id,
      valueName: value.size.name,
      priceModifier: value.size.price - value.basePrice,
    });
  }
  for (const addon of value.addons) {
    selections.push({
      optionId: `legacy-addons-${value.dishId}`,
      optionName: 'الإضافات',
      valueId: addon.id,
      valueName: addon.name,
      priceModifier: addon.price,
    });
  }
  return {
    key: `legacy:${value.key}`,
    dishId: value.dishId,
    name: value.name,
    basePrice: value.basePrice,
    quantity: value.quantity,
    selections,
  };
}

function parseStoredLines(value: string): unknown[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

function readCart(): CartLine[] {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== null) {
      return parseStoredLines(current).filter(isCartLine);
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacy ? parseStoredLines(legacy).map(migrateLegacyLine).filter(
      (line): line is CartLine => line !== null,
    ) : [];
  } catch {
    return [];
  }
}

export function useMenuCart() {
  const [lines, setLines] = useState<CartLine[]>(readCart);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Browser storage can be disabled or full; the in-memory cart still works.
    }
  }, [lines]);

  const add = (dish: MenuDish, quantity: number, selections: MenuOptionSelection[] = []) => {
    if (!dish.isAvailable || !Number.isInteger(quantity) || quantity < 1) return;
    const selectionKey = selections
      .map((selection) => `${selection.optionId}=${selection.valueId}`)
      .sort()
      .join('|');
    const key = `${dish.id}:${selectionKey}`;
    setLines((current) => {
      const found = current.find((line) => line.key === key);
      if (found) {
        return current.map((line) => line.key === key
          ? { ...line, quantity: line.quantity + quantity }
          : line);
      }
      return [...current, {
        key,
        dishId: dish.id,
        name: dish.name,
        basePrice: dish.price,
        quantity,
        selections,
      }];
    });
  };

  const changeQuantity = (key: string, quantity: number) => setLines((current) =>
    quantity < 1
      ? current.filter((line) => line.key !== key)
      : current.map((line) => line.key === key ? { ...line, quantity } : line),
  );
  const remove = (key: string) => setLines((current) => current.filter((line) => line.key !== key));
  const clear = () => setLines([]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => {
    const unitPrice = line.basePrice
      + line.selections.reduce((optionSum, selection) => optionSum + selection.priceModifier, 0);
    return sum + unitPrice * line.quantity;
  }, 0);
  return { lines, add, changeQuantity, remove, clear, count, subtotal };
}