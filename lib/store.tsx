import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { Expense, Group, Member, Settlement } from './types';
import { DEFAULT_CURRENCY } from './money';

type State = {
  groups: Group[];
  customCurrencies?: string[];
  preferredCurrency?: string;
};

type Action =
  | { type: 'hydrate'; state: State }
  | { type: 'addGroup'; group: Group }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'setGroupCurrency'; groupId: string; currency: string }
  | { type: 'addCustomCurrency'; currency: string }
  | { type: 'setPreferredCurrency'; currency: string }
  | { type: 'addMember'; groupId: string; member: Member }
  | { type: 'addExpense'; groupId: string; expense: Expense }
  | { type: 'deleteExpense'; groupId: string; expenseId: string }
  | { type: 'addSettlement'; groupId: string; settlement: Settlement }
  | { type: 'deleteSettlement'; groupId: string; settlementId: string };

const STORAGE_KEY = 'spliti:v1';
const LEGACY_STORAGE_KEY = 'splitwise-clone:v1';

function updateGroup(state: State, groupId: string, fn: (g: Group) => Group): State {
  return { ...state, groups: state.groups.map((g) => (g.id === groupId ? fn(g) : g)) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return {
        groups: action.state.groups || [],
        customCurrencies: action.state.customCurrencies || [],
        preferredCurrency: action.state.preferredCurrency || DEFAULT_CURRENCY,
      };
    case 'addGroup':
      return { ...state, groups: [action.group, ...state.groups] };
    case 'deleteGroup':
      return { ...state, groups: state.groups.filter((g) => g.id !== action.groupId) };
    case 'setGroupCurrency':
      return updateGroup(state, action.groupId, (g) => ({ ...g, currency: action.currency }));
    case 'addCustomCurrency': {
      const currs = state.customCurrencies || [];
      if (currs.includes(action.currency)) return state;
      return { ...state, customCurrencies: [...currs, action.currency] };
    }
    case 'setPreferredCurrency':
      return { ...state, preferredCurrency: action.currency };
    case 'addMember':
      return updateGroup(state, action.groupId, (g) => ({ ...g, members: [...g.members, action.member] }));
    case 'addExpense':
      return updateGroup(state, action.groupId, (g) => ({ ...g, expenses: [action.expense, ...g.expenses] }));
    case 'deleteExpense':
      return updateGroup(state, action.groupId, (g) => ({
        ...g,
        expenses: g.expenses.filter((e) => e.id !== action.expenseId),
      }));
    case 'addSettlement':
      return updateGroup(state, action.groupId, (g) => ({
        ...g,
        settlements: [action.settlement, ...g.settlements],
      }));
    case 'deleteSettlement':
      return updateGroup(state, action.groupId, (g) => ({
        ...g,
        settlements: g.settlements.filter((s) => s.id !== action.settlementId),
      }));
  }
}

type Ctx = { state: State; dispatch: React.Dispatch<Action>; hydrated: boolean };
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { groups: [], customCurrencies: [], preferredCurrency: DEFAULT_CURRENCY });
  const [hydrated, setHydrated] = useState(false);

  // Load saved data once on startup (checks new key first, then legacy).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (raw) {
          dispatch({ type: 'hydrate', state: JSON.parse(raw) });
        } else {
          const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) dispatch({ type: 'hydrate', state: JSON.parse(legacy) });
        }
      })
      .catch((e) => console.warn('Failed to load data', e))
      .finally(() => setHydrated(true));
  }, []);

  // Save on every change, but only after loading (so we never overwrite saved data with empty state).
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Failed to save data', e),
    );
  }, [state, hydrated]);

  return <StoreContext.Provider value={{ state, dispatch, hydrated }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
