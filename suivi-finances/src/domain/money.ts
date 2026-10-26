import type { Cents } from './types';

export type Currency = 'MAD' | 'EUR';

const SYMBOL: Record<Currency, string> = { MAD: 'DH', EUR: '€' };

/** Devise d'affichage : réglée au démarrage depuis les réglages de l'app. Les montants stockés sont de simples centimes. */
let current: Currency = 'MAD';
export const setCurrency = (c: Currency): void => { current = c; };
export const getCurrency = (): Currency => current;
/** « DH » ou « € » : pour les libellés de champs. */
export const currencySymbol = (): string => SYMBOL[current];

/** Retire espaces (y compris insécables), symboles de devise et unités avant lecture d'un nombre. */
const clean = (input: string): string => input.replace(/[\s  €]/g, '').replace(/dh|mad/gi, '');

/**
 * Convertit une saisie utilisateur ("12,50", "12.5", "1 200,00", "500 DH") en centimes.
 * Retourne null si la saisie est invalide, négative, nulle ou a plus de 2 décimales.
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = clean(input).replace(',', '.');
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
  const body = clean(neg ? t.slice(1) : t);
  if (/^0*([.,]0{1,2})?$/.test(body)) return 0;
  const v = parseAmount(body);
  return v === null ? null : neg ? -v : v;
}

/** Comme parseAmount, mais une saisie vide ou 0 donne 0 (champs facultatifs d'une répartition). Jamais négatif. */
export function parseOptionalAmount(input: string): Cents | null {
  const t = input.trim();
  if (t.startsWith('-')) return null;
  return parseBalance(t);
}

/** Affiche des centimes avec la devise choisie : "1 234,50 DH" ou "1 234,50 €". */
export function formatAmount(cents: Cents): string {
  const number = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
  return `${number} ${SYMBOL[current]}`;
}

/** Montant sans les centimes quand il est rond : "1 200 DH" ; sinon avec : "1 200,50 DH". */
export function formatAmountShort(cents: Cents): string {
  return cents % 100 === 0
    ? `${new Intl.NumberFormat('fr-FR').format(cents / 100)} ${SYMBOL[current]}`
    : formatAmount(cents);
}
