import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CurrencySelector } from '../components/CurrencySelector';
import { Button, Card, Field, SectionTitle } from '../components/ui';
import { computeBalances, simplifyDebts } from '../lib/balances';
import { newId } from '../lib/id';
import { DEFAULT_CURRENCY, formatMoney } from '../lib/money';
import { useStore } from '../lib/store';
import { colors, moneyText } from '../lib/theme';

export default function GroupsScreen() {
  const { state, dispatch, hydrated } = useStore();
  const [name, setName] = useState('');
  const [members, setMembers] = useState('');
  const [currency, setCurrency] = useState(state.preferredCurrency || DEFAULT_CURRENCY);

  const createGroup = () => {
    const seen = new Set<string>();
    const names = members
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));

    if (!name.trim()) return Alert.alert('Name the group', 'For example "Goa trip" or "Flat 4B".');
    if (names.length < 2) return Alert.alert('Add people', 'Enter at least two names, separated by commas.');

    const groupCurrency = currency.trim() || DEFAULT_CURRENCY;

    dispatch({
      type: 'addGroup',
      group: {
        id: newId(),
        name: name.trim(),
        currency: groupCurrency,
        members: names.map((n) => ({ id: newId(), name: n })),
        expenses: [],
        settlements: [],
        createdAt: Date.now(),
      },
    });
    setName('');
    setMembers('');
  };

  const confirmDelete = (groupId: string, groupName: string) =>
    Alert.alert('Delete group?', `"${groupName}" and all its expenses will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'deleteGroup', groupId }) },
    ]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>Spliti</Text>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>Split It</Text>
          </View>
        </View>
        <Text style={styles.brandSubtitle}>Split expenses easily in Rupees (₹), Dollars ($), or any currency</Text>
      </View>

      {state.groups.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.empty}>Create a group below for a trip, a dinner, or a shared flat, and choose your preferred currency.</Text>
        </Card>
      ) : (
        state.groups.map((g) => {
          const total = g.expenses.reduce((s, e) => s + e.amount, 0);
          const open = simplifyDebts(computeBalances(g)).length;
          const groupCurrency = g.currency || DEFAULT_CURRENCY;
          return (
            <Pressable
              key={g.id}
              onPress={() => router.push(`/group/${g.id}`)}
              onLongPress={() => confirmDelete(g.id, g.name)}
            >
              <Card style={styles.groupRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{groupCurrency}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.groupName}>{g.name}</Text>
                  <Text style={styles.meta}>
                    {g.members.length} people, {open === 0 ? 'all settled' : `${open} payment${open > 1 ? 's' : ''} pending`}
                  </Text>
                </View>
                <Text style={[styles.total, moneyText]}>{formatMoney(total, groupCurrency)}</Text>
              </Card>
            </Pressable>
          );
        })
      )}

      <SectionTitle>New group</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Group name" value={name} onChangeText={setName} placeholder="Goa trip, Flat 4B, Dinner" />
        <Field
          label="People"
          value={members}
          onChangeText={setMembers}
          placeholder="You, Arun, Priya"
          autoCapitalize="words"
        />

        {/* Currency Picker */}
        <CurrencySelector
          label="Currency for this group"
          selectedCurrency={currency}
          onSelect={setCurrency}
        />

        <Button title="Create group" onPress={createGroup} />
      </Card>
      {state.groups.length > 0 && <Text style={styles.hint}>Long-press a group to delete it.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandHeader: {
    paddingVertical: 12,
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
  },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currencyBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
  groupName: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13 },
  total: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});

