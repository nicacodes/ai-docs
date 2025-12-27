import { STORAGE_KEY } from '@/constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inferTitle(md: string): string {
  const lines = String(md || '').split(/\r?\n/);
  for (const line of lines) {
    const m = /^\s*#\s+(.+)\s*$/.exec(line);
    if (m?.[1]) return m[1].trim().slice(0, 120);
  }
  for (const line of lines) {
    const t = line.trim();
    if (t) return t.slice(0, 120);
  }
  return 'Sin título';
}

export function loadCurrentDoc() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const id = parsed.id;
    const slug = parsed.slug;
    if (typeof id !== 'string' || typeof slug !== 'string') return null;
    if (!id || !slug) return null;
    return { id, slug } as const;
  } catch {
    return null;
  }
}
