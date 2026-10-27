import { Group } from './types';

/**
 * Net balance per member, in minor units.
 * Positive = the group owes them money. Negative = they owe the group.
 * The sum of all balances is always 0.
 */
export function computeBalances(group: Group): Record<string, number> {
  const net: Record<string, number> = {};
  for (const m of group.members) net[m.id] = 0;

  for (const e of group.expenses) {
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;
    for (const [id, share] of Object.entries(e.shares)) {
      net[id] = (net[id] ?? 0) - share;
    }
  }
  for (const s of group.settlements) {
    net[s.from] = (net[s.from] ?? 0) + s.amount;
    net[s.to] = (net[s.to] ?? 0) - s.amount;
  }
  return net;
}

export type Transfer = { from: string; to: string; amount: number };

/**
 * "Simplify debts": greedily match the biggest debtor with the biggest creditor.
 * Produces at most (n - 1) payments for n people.
 */
export function simplifyDebts(net: Record<string, number>): Transfer[] {
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}
