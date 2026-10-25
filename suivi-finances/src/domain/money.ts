import type { Cents } from './types';

/**
 * Convertit une saisie utilisateur ("12,50", "12.5", "1 200,00") en centimes.
 * Retourne null si la saisie est invalide, négative, nulle ou a plus de 2 décimales.
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[\s  €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', frac = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

/** Comme parseAmount, mais accepte 0 (ou vide) et un signe « - » : pour les soldes initiaux. */
export function parseBalance(input: string): Cents | null {
  const t = input.trim();
  const neg = t.startsWith('-');
  const body = (neg ? t.slice(1) : t).replace(/[\s\u00a0\u202f€]/g, '');
  if (/^0*([.,]0{1,2})?$/.test(body)) return 0;
  const v = parseAmount(body);
  return v === null ? null : neg ? -v : v;
}

/** Affiche des centimes en euros, format français : "1 234,50 €". */
export function formatAmount(cents: Cents): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
