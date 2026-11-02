import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface LoadingScreenProps {
  message?: string;
}

/** Shown while the stored session is being validated against /auth/me. */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Connecting to VARTA…',
}) => (
  <View style={styles.container}>
    <View style={styles.logoCircle}>
      <Text style={styles.logoText}>V</Text>
    </View>
    <Text style={styles.brand}>VARTA</Text>
    <Text style={styles.tagline}>Baat Sabki</Text>
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  brand: { marginTop: 12, fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: 2 },
  tagline: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  message: { marginTop: 24, fontSize: 13, color: '#94A3B8' },
});
