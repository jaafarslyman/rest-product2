import { useEffect, useState } from 'react';
import type { MenuAddon, MenuDish, MenuSize } from './menu-data';

export type CartLine = {
  key: string;
  dishId: string;
  name: string;
  basePrice: number;
  quantity: number;
  size?: MenuSize;
  addons: MenuAddon[];
};

const STORAGE_KEY = 'aurelia-menu-cart-v1';

function isPriceOption(value: unknown): value is MenuSize {
  if (typeof value !== 'object' || value === null) return false;
  const option = value as Record<string, unknown>;
  return typeof option.id === 'string'
    && typeof option.name === 'string'
    && typeof option.price === 'number'
    && Number.isFinite(option.price)
    && option.price >= 0;
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return typeof line.key === 'string'
    && line.key.length > 0
    && typeof line.dishId === 'string'
    && typeof line.name === 'string'
    && typeof line.basePrice === 'number'
    && Number.isFinite(line.basePrice)
    && line.basePrice >= 0
    && typeof line.quantity === 'number'
    && Number.isInteger(line.quantity)
    && line.quantity > 0
    && Array.isArray(line.addons)
    && line.addons.every(isPriceOption)
    && (line.size === undefined || isPriceOption(line.size));
}

function readCart(): CartLine[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return [];
  }
}

export function useMenuCart() {
  const [lines, setLines] = useState<CartLine[]>(readCart);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* Storage may be unavailable. */ }
  }, [lines]);

  const add = (dish: MenuDish, quantity: number, size?: MenuSize, addons: MenuAddon[] = []) => {
    const key = [dish.id, size?.id ?? '', ...addons.map((addon) => addon.id).sort()].join(':');
    setLines((current) => {
      const found = current.find((line) => line.key === key);
      if (found) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + quantity } : line);
      return [...current, { key, dishId: dish.id, name: dish.name, basePrice: dish.price, quantity, size, addons }];
    });
  };
  const changeQuantity = (key: string, quantity: number) => setLines((current) => quantity < 1 ? current.filter((line) => line.key !== key) : current.map((line) => line.key === key ? { ...line, quantity } : line));
  const remove = (key: string) => setLines((current) => current.filter((line) => line.key !== key));
  const clear = () => setLines([]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (line.size?.price ?? line.basePrice) * line.quantity + line.addons.reduce((addonSum, addon) => addonSum + addon.price, 0) * line.quantity, 0);
  return { lines, add, changeQuantity, remove, clear, count, subtotal };
}