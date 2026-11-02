import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface VartaLogoProps {
  size?: number | 'sm' | 'md' | 'lg';
  showText?: boolean;
  showTagline?: boolean;
  centered?: boolean;
  horizontal?: boolean;
  variant?: 'mark' | 'full';
}

export const VartaLogo: React.FC<VartaLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = true,
  centered = false,
  horizontal = true,
  variant = 'mark',
}) => {
  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 28
      : size === 'md'
      ? 36
      : 52;

  if (variant === 'full') {
    return (
      <View style={[styles.container, centered && styles.centered]}>
        <Image
          source={require('../../../assets/varta-logo.png')}
          style={{ height: numericSize, width: numericSize * 3.4 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        centered && styles.centered,
        horizontal ? styles.row : styles.column,
      ]}
    >
      {/* 3D Official VARTA Emblem from Website */}
      <Image
        source={require('../../../assets/varta-logo-mark.png')}
        style={{
          width: numericSize,
          height: numericSize * 1.05,
        }}
        resizeMode="contain"
      />

      {/* Brand Wordmark & Tricolor Accent Tagline */}
      {showText && (
        <View style={[styles.textWrapper, centered && styles.centeredText]}>
          <Text
            style={[
              styles.brandTitle,
              { fontSize: Math.max(16, Math.round(numericSize * 0.58)) },
            ]}
          >
            VARTA
          </Text>
          {showTagline && (
            <View style={styles.taglineRow}>
              <View style={styles.saffronBar} />
              <Text
                style={[
                  styles.taglineText,
                  { fontSize: Math.max(8.5, Math.round(numericSize * 0.27)) },
                ]}
              >
                Baat Sabki
              </Text>
              <View style={styles.greenBar} />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  centered: {
    alignSelf: 'center',
  },
  centeredText: {
    alignItems: 'center',
  },
  textWrapper: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  brandTitle: {
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.2,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  saffronBar: {
    width: 12,
    height: 2.5,
    backgroundColor: '#FF9933',
    borderRadius: 2,
  },
  greenBar: {
    width: 12,
    height: 2.5,
    backgroundColor: '#00C853',
    borderRadius: 2,
  },
  taglineText: {
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
  },
});
