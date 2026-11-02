import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
  showOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = 'V',
  size = 40,
  borderWidth = 0,
  borderColor = colors.white,
  showOnline = false,
}) => {
  const [error, setError] = useState(false);

  const safeName = name || 'V';
  const initials = safeName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {uri && !error ? (
        <Image
          source={{ uri }}
          onError={() => setError(true)}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth,
              borderColor,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth,
              borderColor,
            },
          ]}
        >
          <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>
            {initials}
          </Text>
        </View>
      )}

      {showOnline && (
        <View
          style={[
            styles.onlineBadge,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: colors.slate100,
  },
  fallback: {
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
    color: colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
