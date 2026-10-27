import { formatMoney, toMinor } from './money';
import { SplitType } from './types';

/** Split evenly; leftover cents go one each to the first people so the total always matches. */
export function splitEqual(amount: number, memberIds: string[]): Record<string, number> {
  const base = Math.floor(amount / memberIds.length);
  let remainder = amount - base * memberIds.length;
  const result: Record<string, number> = {};
  for (const id of memberIds) {
    result[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return result;
}

/** Split by percentages using the largest-remainder method, so shares always sum to `amount`. */
export function splitByPercent(amount: number, percents: Record<string, number>): Record<string, number> {
  const raw = Object.entries(percents)
    .filter(([, p]) => p > 0)
    .map(([id, p]) => ({ id, exact: (amount * p) / 100 }));
  const result: Record<string, number> = {};
  let allocated = 0;
  for (const r of raw) {
    result[r.id] = Math.floor(r.exact);
    allocated += result[r.id];
  }
  let remainder = amount - allocated;
  const byFraction = [...raw].sort(
    (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)),
  );
  for (let i = 0; remainder > 0 && byFraction.length > 0; i = (i + 1) % byFraction.length) {
    result[byFraction[i].id]++;
    remainder--;
  }
  return result;
}

export type SplitResult =
  | { ok: true; shares: Record<string, number> }
  | { ok: false; error: string };

/**
 * Turn the add-expense form into final shares.
 * - equal:   `participants` are the people included
 * - exact:   `values[id]` is a money string per person
 * - percent: `values[id]` is a percentage string per person
 */
export function buildShares(
  amount: number,
  type: SplitType,
  memberIds: string[],
  participants: string[],
  values: Record<string, string>,
  currency?: string,
): SplitResult {
  if (!(amount > 0)) return { ok: false, error: 'Enter an amount greater than zero.' };

  if (type === 'equal') {
    if (participants.length === 0) return { ok: false, error: 'Include at least one person.' };
    return { ok: true, shares: splitEqual(amount, participants) };
  }

  if (type === 'exact') {
    const shares: Record<string, number> = {};
    let sum = 0;
    for (const id of memberIds) {
      const v = values[id]?.trim();
      if (!v) continue;
      const m = toMinor(v);
      if (m === null) return { ok: false, error: `"${v}" isn't a valid amount.` };
      if (m > 0) {
        shares[id] = m;
        sum += m;
      }
    }
    if (sum !== amount) {
      const diff = amount - sum;
      return {
        ok: false,
        error: diff > 0 ? `${formatMoney(diff, currency)} left to assign.` : `${formatMoney(-diff, currency)} over the total.`,
      };
    }
    return { ok: true, shares };
  }

  // percent
  const percents: Record<string, number> = {};
  let total = 0;
  for (const id of memberIds) {
    const v = values[id]?.trim();
    if (!v) continue;
    const p = Number(v);
    if (Number.isNaN(p) || p < 0) return { ok: false, error: `"${v}" isn't a valid percentage.` };
    percents[id] = p;
    total += p;
  }
  if (Math.abs(total - 100) > 0.001) {
    const left = Math.round((100 - total) * 100) / 100;
    return { ok: false, error: left > 0 ? `${left}% left to assign.` : `${-left}% over 100%.` };
  }
  return { ok: true, shares: splitByPercent(amount, percents) };
}
