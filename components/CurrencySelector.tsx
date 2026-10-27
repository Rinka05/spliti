import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PRESET_CURRENCIES } from '../lib/money';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onSelect: (curr: string) => void;
  label?: string;
}

export function CurrencySelector({
  selectedCurrency,
  onSelect,
  label = 'Currency',
}: CurrencySelectorProps) {
  const { state, dispatch } = useStore();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Combine preset currencies with any user-saved custom currencies
  const userCustoms = state.customCurrencies || [];

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 6) {
      Alert.alert('Invalid currency', 'Currency symbol or code should be 1-6 characters (e.g. ₹, $, AED, CAD).');
      return;
    }
    dispatch({ type: 'addCustomCurrency', currency: trimmed });
    onSelect(trimmed);
    setCustomInput('');
    setShowCustomInput(false);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.chipGrid}>
        {PRESET_CURRENCIES.map((c) => {
          const isSelected = selectedCurrency === c.symbol || selectedCurrency === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => onSelect(c.symbol)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.symbolText, isSelected && styles.chipTextSelected]}>{c.symbol}</Text>
              <Text style={[styles.nameText, isSelected && styles.chipTextSelected]}>{c.code}</Text>
            </Pressable>
          );
        })}

        {/* User-defined custom currencies */}
        {userCustoms.map((custom) => {
          // If already in presets, don't duplicate
          if (PRESET_CURRENCIES.some((p) => p.symbol === custom || p.code === custom)) return null;
          const isSelected = selectedCurrency === custom;
          return (
            <Pressable
              key={custom}
              onPress={() => onSelect(custom)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.symbolText, isSelected && styles.chipTextSelected]}>{custom}</Text>
            </Pressable>
          );
        })}

        {/* Add custom currency chip */}
        <Pressable
          onPress={() => setShowCustomInput(!showCustomInput)}
          style={[styles.chip, styles.chipAdd, showCustomInput && styles.chipAddActive]}
        >
          <Text style={[styles.addText, showCustomInput && styles.chipTextSelected]}>
            {showCustomInput ? '✕ Cancel' : '+ Other'}
          </Text>
        </Pressable>
      </View>

      {/* Inline custom currency adder */}
      {showCustomInput && (
        <View style={styles.customInputRow}>
          <TextInput
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="e.g. SGD, ฿, ₩, CHF, AED"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            maxLength={6}
            style={styles.customInput}
            onSubmitEditing={handleAddCustom}
          />
          <Pressable onPress={handleAddCustom} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add & Use</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipAdd: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    borderColor: colors.accent,
  },
  chipAddActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  nameText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  chipTextSelected: {
    color: colors.accentText,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.ink,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
});
