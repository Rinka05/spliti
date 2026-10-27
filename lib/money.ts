export const DEFAULT_CURRENCY = '₹';

export interface CurrencyOption {
  symbol: string;
  name: string;
  code: string;
}

export const PRESET_CURRENCIES: CurrencyOption[] = [
  { symbol: '₹', name: 'Rupee (INR)', code: 'INR' },
  { symbol: '$', name: 'Dollar (USD)', code: 'USD' },
  { symbol: '€', name: 'Euro (EUR)', code: 'EUR' },
  { symbol: '£', name: 'Pound (GBP)', code: 'GBP' },
  { symbol: '¥', name: 'Yen / Yuan (JPY)', code: 'JPY' },
  { symbol: 'AED', name: 'Dirham (AED)', code: 'AED' },
  { symbol: 'C$', name: 'Canadian Dollar (CAD)', code: 'CAD' },
  { symbol: 'A$', name: 'Australian Dollar (AUD)', code: 'AUD' },
];

/** Parse user input like "120.5" into minor units (12050). Returns null if invalid. */
export function toMinor(input: string): number | null {
  const cleaned = input.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** Format minor units for display: 123456 with '$' -> "$1,234.56", with 'INR' -> "INR 1,234.56" */
export function formatMoney(minor: number, currency: string = DEFAULT_CURRENCY): string {
  const curr = currency?.trim() || DEFAULT_CURRENCY;
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = String(abs % 100).padStart(2, '0');
  const separator = curr.length > 2 ? ' ' : '';
  return `${sign}${curr}${separator}${whole}.${frac}`;
}
