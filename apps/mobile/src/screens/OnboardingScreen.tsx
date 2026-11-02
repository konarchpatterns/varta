import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VartaLogo } from '../components/common/VartaLogo';
import { colors } from '../theme/colors';
import { ScreenName } from '../types';

interface OnboardingScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

const { width } = Dimensions.get('window');

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Logo */}
        <View style={styles.logoWrapper}>
          <VartaLogo size="lg" showTagline centered />
        </View>

        {/* Hero Title & Subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.titlePeople}>Real People.</Text>
          <Text style={styles.titleConversations}>Real Conversations.</Text>
          <Text style={styles.subtitle}>
            India's space for conversations, ideas and community.
          </Text>
        </View>

        {/* Hero Illustration / Artwork */}
        <View style={styles.artworkContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Subtle Tricolor Ribbon Overlay Graphic */}
          <View style={styles.tricolorBanner}>
            <View style={styles.ribbonSaffron} />
            <View style={styles.ribbonWhite} />
            <View style={styles.ribbonGreen} />
          </View>
        </View>

        {/* Bottom Pagination & CTA */}
        <View style={styles.bottomSection}>
          {/* 3-dots indicator */}
          <View style={styles.paginationDots}>
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
          </View>

          {/* "Get Started →" Button (Creates Account) */}
          <TouchableOpacity
            style={styles.getStartedButton}
            activeOpacity={0.85}
            onPress={() => onNavigate('signup')}
          >
            <Text style={styles.getStartedButtonText}>Get Started →</Text>
          </TouchableOpacity>

          {/* Secondary Sign In Option */}
          <TouchableOpacity
            style={styles.signInSecondaryBtn}
            activeOpacity={0.8}
            onPress={() => onNavigate('signin')}
          >
            <Text style={styles.signInSecondaryText}>I already have an account</Text>
          </TouchableOpacity>

          {/* Explore as Guest Option */}
          <TouchableOpacity
            style={styles.guestLink}
            activeOpacity={0.7}
            onPress={() => onNavigate('home')}
          >
            <Text style={styles.guestLinkText}>Explore Feed as Guest ➔</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  titlePeople: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleConversations: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 280,
  },
  artworkContainer: {
    flex: 1,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  tricolorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  ribbonSaffron: {
    flex: 1,
    backgroundColor: '#FF6B00',
  },
  ribbonWhite: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  ribbonGreen: {
    flex: 1,
    backgroundColor: '#138808',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 20,
    marginTop: 10,
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  getStartedButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signInSecondaryBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  signInSecondaryText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  guestLink: {
    marginTop: 6,
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestLinkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
});
