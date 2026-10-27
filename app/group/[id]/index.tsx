import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CurrencySelector } from '../../../components/CurrencySelector';
import { Button, Card, Chip, Field, SectionTitle } from '../../../components/ui';
import { computeBalances, simplifyDebts } from '../../../lib/balances';
import { newId } from '../../../lib/id';
import { DEFAULT_CURRENCY, formatMoney } from '../../../lib/money';
import { useStore } from '../../../lib/store';
import { colors, moneyText } from '../../../lib/theme';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const group = state.groups.find((g) => g.id === id);
  const [tab, setTab] = useState<'activity' | 'balances'>('activity');
  const [newMember, setNewMember] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const net = useMemo(() => (group ? computeBalances(group) : {}), [group]);
  const transfers = useMemo(() => simplifyDebts(net), [net]);

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>This group no longer exists.</Text>
      </View>
    );
  }

  const currency = group.currency || DEFAULT_CURRENCY;
  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? 'Unknown';
  const total = group.expenses.reduce((s, e) => s + e.amount, 0);

  // Expenses and settlements together, newest first.
  const activity = [
    ...group.expenses.map((e) => ({ kind: 'expense' as const, item: e, at: e.createdAt })),
    ...group.settlements.map((s) => ({ kind: 'settlement' as const, item: s, at: s.createdAt })),
  ].sort((a, b) => b.at - a.at);

  const confirmDelete = (label: string, onDelete: () => void) =>
    Alert.alert('Delete?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  const recordPayment = (from: string, to: string, amount: number) =>
    Alert.alert('Record payment', `${nameOf(from)} paid ${nameOf(to)} ${formatMoney(amount, currency)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Record payment',
        onPress: () =>
          dispatch({
            type: 'addSettlement',
            groupId: group.id,
            settlement: { id: newId(), from, to, amount, createdAt: Date.now() },
          }),
      },
    ]);

  const addMember = () => {
    const n = newMember.trim();
    if (!n) return;
    if (group.members.some((m) => m.name.toLowerCase() === n.toLowerCase())) {
      return Alert.alert('Already in the group', `${n} is already a member.`);
    }
    dispatch({ type: 'addMember', groupId: group.id, member: { id: newId(), name: n } });
    setNewMember('');
  };

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryRow}>
          <View style={styles.summary}>
            <Text style={styles.muted}>Total spent</Text>
            <Text style={[styles.bigTotal, moneyText]}>{formatMoney(total, currency)}</Text>
            <Text style={styles.muted}>{group.members.map((m) => m.name).join(', ')}</Text>
          </View>
          <Pressable
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            style={[styles.currencyToggle, showCurrencyPicker && styles.currencyToggleActive]}
          >
            <Text style={[styles.currencyToggleSymbol, showCurrencyPicker && { color: colors.accentText }]}>
              {currency}
            </Text>
            <Text style={[styles.currencyToggleLabel, showCurrencyPicker && { color: colors.accentText }]}>
              {showCurrencyPicker ? 'Done' : 'Change'}
            </Text>
          </Pressable>
        </View>

        {showCurrencyPicker && (
          <Card style={styles.currencyPickerCard}>
            <CurrencySelector
              label="Select or add currency for this group"
              selectedCurrency={currency}
              onSelect={(newCurr) => {
                dispatch({ type: 'setGroupCurrency', groupId: group.id, currency: newCurr });
              }}
            />
          </Card>
        )}

        <Button title="Add expense" onPress={() => router.push(`/group/${group.id}/add-expense`)} />

        <View style={styles.tabs}>
          <Chip label="Activity" selected={tab === 'activity'} onPress={() => setTab('activity')} />
          <Chip label="Balances" selected={tab === 'balances'} onPress={() => setTab('balances')} />
        </View>

        {tab === 'activity' ? (
          activity.length === 0 ? (
            <Text style={styles.muted}>No expenses yet. Add the first one above.</Text>
          ) : (
            <>
              {activity.map((a) =>
                a.kind === 'expense' ? (
                  <Pressable
                    key={a.item.id}
                    onLongPress={() =>
                      confirmDelete(`Delete "${a.item.description}"?`, () =>
                        dispatch({ type: 'deleteExpense', groupId: group.id, expenseId: a.item.id }),
                      )
                    }
                  >
                    <Card style={styles.row}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.rowTitle}>{a.item.description}</Text>
                        <Text style={styles.muted}>
                          {nameOf(a.item.paidBy)} paid, split {Object.keys(a.item.shares).length} ways
                        </Text>
                      </View>
                      <Text style={[styles.rowAmount, moneyText]}>{formatMoney(a.item.amount, currency)}</Text>
                    </Card>
                  </Pressable>
                ) : (
                  <Pressable
                    key={a.item.id}
                    onLongPress={() =>
                      confirmDelete('Delete this payment?', () =>
                        dispatch({ type: 'deleteSettlement', groupId: group.id, settlementId: a.item.id }),
                      )
                    }
                  >
                    <Card style={[styles.row, styles.settlementRow]}>
                      <Text style={[styles.muted, { flex: 1 }]}>
                        {nameOf(a.item.from)} paid {nameOf(a.item.to)}
                      </Text>
                      <Text style={[styles.muted, moneyText]}>{formatMoney(a.item.amount, currency)}</Text>
                    </Card>
                  </Pressable>
                ),
              )}
              <Text style={styles.hint}>Long-press an item to delete it.</Text>
            </>
          )
        ) : (
          <>
            <Card style={{ gap: 12 }}>
              {group.members.map((m) => {
                const v = net[m.id] ?? 0;
                return (
                  <View key={m.id} style={styles.balanceRow}>
                    <Text style={styles.rowTitle}>{m.name}</Text>
                    <Text
                      style={[
                        styles.balance,
                        moneyText,
                        { color: v > 0 ? colors.getsBack : v < 0 ? colors.owes : colors.muted },
                      ]}
                    >
                      {v > 0 ? `gets back ${formatMoney(v, currency)}` : v < 0 ? `owes ${formatMoney(-v, currency)}` : 'settled up'}
                    </Text>
                  </View>
                );
              })}
            </Card>

            <SectionTitle>Suggested payments</SectionTitle>
            {transfers.length === 0 ? (
              <Text style={styles.muted}>Everyone is settled up.</Text>
            ) : (
              transfers.map((t) => (
                <Card key={`${t.from}-${t.to}`} style={styles.row}>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>
                    {nameOf(t.from)} pays {nameOf(t.to)}{' '}
                    <Text style={[{ color: colors.owes }, moneyText]}>{formatMoney(t.amount, currency)}</Text>
                  </Text>
                  <Pressable onPress={() => recordPayment(t.from, t.to, t.amount)} hitSlop={8}>
                    <Text style={styles.link}>Record</Text>
                  </Pressable>
                </Card>
              ))
            )}

            <SectionTitle>Add a person</SectionTitle>
            <View style={styles.addMember}>
              <View style={{ flex: 1 }}>
                <Field value={newMember} onChangeText={setNewMember} placeholder="Name" onSubmitEditing={addMember} />
              </View>
              <Button title="Add" variant="secondary" onPress={addMember} />
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summary: { flex: 1, gap: 2, paddingVertical: 4 },
  currencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginTop: 6,
  },
  currencyToggleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  currencyToggleSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  currencyToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  currencyPickerCard: {
    padding: 14,
    gap: 8,
  },
  bigTotal: { color: colors.ink, fontSize: 34, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 14 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settlementRow: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '500' },
  rowAmount: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balance: { fontSize: 15, fontWeight: '600' },
  link: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  addMember: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});

