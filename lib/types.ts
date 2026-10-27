// All money values are stored as integers in minor units (cents / paise).
// Never store money as floating-point numbers: 0.1 + 0.2 !== 0.3.

export type Member = { id: string; name: string };

export type SplitType = 'equal' | 'exact' | 'percent';

export type Expense = {
  id: string;
  description: string;
  amount: number; // minor units
  paidBy: string; // member id
  splitType: SplitType;
  shares: Record<string, number>; // member id -> minor units they owe for this expense
  createdAt: number;
};

// A settlement is a real-world payment: `from` paid `to` back.
export type Settlement = {
  id: string;
  from: string;
  to: string;
  amount: number; // minor units
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  currency?: string; // '$', '₹', '€', '£', etc. Defaults to '$' or user choice
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  createdAt: number;
};
