import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Field, SectionTitle } from '../../../components/ui';
import { newId } from '../../../lib/id';
import { DEFAULT_CURRENCY, formatMoney, toMinor } from '../../../lib/money';
import { buildShares } from '../../../lib/split';
import { useStore } from '../../../lib/store';
import { colors, moneyText } from '../../../lib/theme';
import { SplitType } from '../../../lib/types';

const SPLIT_LABELS: Record<SplitType, string> = {
  equal: 'Equally',
  exact: 'Exact amounts',
  percent: 'Percentages',
};

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const group = state.groups.find((g) => g.id === id);

  const currency = group?.currency || DEFAULT_CURRENCY;

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [paidBy, setPaidBy] = useState(group?.members[0]?.id ?? '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participants, setParticipants] = useState<string[]>(group?.members.map((m) => m.id) ?? []);
  const [values, setValues] = useState<Record<string, string>>({});

  const amount = toMinor(amountText);
  const memberIds = group?.members.map((m) => m.id) ?? [];

  const result = useMemo(
    () => (amount ? buildShares(amount, splitType, memberIds, participants, values, currency) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amount, splitType, participants, values, group, currency],
  );

  if (!group) return null;

  const toggle = (memberId: string) =>
    setParticipants((p) => (p.includes(memberId) ? p.filter((x) => x !== memberId) : [...p, memberId]));

  const changeSplit = (t: SplitType) => {
    setSplitType(t);
    setValues({});
  };

  const canSave = description.trim().length > 0 && !!amount && result?.ok === true;

  const save = () => {
    if (!amount || !result || !result.ok) return;
    dispatch({
      type: 'addExpense',
      groupId: group.id,
      expense: {
        id: newId(),
        description: description.trim(),
        amount,
        paidBy,
        splitType,
        shares: result.shares,
        createdAt: Date.now(),
      },
    });
    router.back();
  };

  let status = 'Enter a description and amount.';
  if (amountText && amount === null) status = 'Use a number like 450 or 450.50.';
  else if (result && !result.ok) status = result.error;
  else if (result?.ok) status = 'Adds up. Ready to save.';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Dinner at the beach shack" />
          <Field
            label={`Amount (${currency})`}
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={[{ fontSize: 22, fontWeight: '600' }, moneyText]}
          />
        </Card>

        <SectionTitle>Paid by</SectionTitle>
        <View style={styles.chips}>
          {group.members.map((m) => (
            <Chip key={m.id} label={m.name} selected={paidBy === m.id} onPress={() => setPaidBy(m.id)} />
          ))}
        </View>

        <SectionTitle>Split</SectionTitle>
        <View style={styles.chips}>
          {(Object.keys(SPLIT_LABELS) as SplitType[]).map((t) => (
            <Chip key={t} label={SPLIT_LABELS[t]} selected={splitType === t} onPress={() => changeSplit(t)} />
          ))}
        </View>

        <Card style={{ gap: 10 }}>
          {group.members.map((m) => {
            const share = result?.ok ? result.shares[m.id] : undefined;
            return (
              <View key={m.id} style={styles.memberRow}>
                {splitType === 'equal' ? (
                  <Chip label={m.name} selected={participants.includes(m.id)} onPress={() => toggle(m.id)} />
                ) : (
                  <Text style={styles.memberName}>{m.name}</Text>
                )}

                {splitType !== 'equal' && (
                  <TextInput
                    value={values[m.id] ?? ''}
                    onChangeText={(v) => setValues((prev) => ({ ...prev, [m.id]: v }))}
                    placeholder={splitType === 'percent' ? '%' : '0.00'}
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    style={[styles.smallInput, moneyText]}
                  />
                )}

                <Text style={[styles.share, moneyText]}>
                  {share !== undefined ? formatMoney(share, currency) : '–'}
                </Text>
              </View>
            );
          })}
        </Card>

        <Text style={[styles.status, { color: result?.ok ? colors.getsBack : colors.muted }]}>{status}</Text>

        <Button title="Save expense" onPress={save} disabled={!canSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  memberName: { color: colors.ink, fontSize: 16, flex: 1 },
  smallInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'right',
  },
  share: { color: colors.muted, fontSize: 14, minWidth: 80, textAlign: 'right', marginLeft: 'auto' },
  status: { fontSize: 14, textAlign: 'center' },
});
