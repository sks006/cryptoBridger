import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CardBalanceProps {
  amount: number;
}

export const CardBalance: React.FC<CardBalanceProps> = ({ amount }) => {
  return (
    <View style={styles.amountCard}>
      <Text style={styles.amountLabel}>Total to Pay</Text>
      <View style={styles.amountRow}>
        <Text style={styles.currencySymbol}>$</Text>
        <Text style={styles.amountText}>{amount.toFixed(2)}</Text>
        <Text style={styles.currencyCode}>USDC</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  amountCard: {
    alignItems: 'center',
    marginBottom: 60,
  },
  amountLabel: {
    color: '#666',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    color: '#666',
    fontSize: 24,
    marginRight: 4,
  },
  amountText: {
    color: 'white',
    fontSize: 56,
    fontWeight: '800',
  },
  currencyCode: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
});
