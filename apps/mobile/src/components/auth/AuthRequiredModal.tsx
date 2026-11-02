import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { VartaLogo } from '../common/VartaLogo';
import { colors } from '../../theme/colors';

interface AuthRequiredModalProps {
  visible: boolean;
  featureName?: string;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  visible,
  featureName = 'this feature',
  onClose,
  onSignIn,
  onSignUp,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetCard}>
          {/* Top handle pill */}
          <View style={styles.pill} />

          {/* Logo & Header */}
          <View style={styles.header}>
            <VartaLogo size="sm" showTagline={false} horizontal />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Icon Badge */}
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeEmoji}>🔐</Text>
          </View>

          <Text style={styles.title}>Sign in required</Text>
          <Text style={styles.subtitle}>
            You need to be signed in to access <Text style={styles.featureHighlight}>{featureName}</Text>. Join millions of Indians on VARTA to connect, message, and engage!
          </Text>

          {/* Value Props */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitEmoji}>💬</Text>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>Direct & Group Messaging</Text>
                <Text style={styles.benefitDesc}>Chat with friends, creators, and community members</Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <Text style={styles.benefitEmoji}>🏛️</Text>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>Bharat Communities & Groups</Text>
                <Text style={styles.benefitDesc}>Participate in discussions across regional and interest clubs</Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <Text style={styles.benefitEmoji}>👤</Text>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>Creator Profiles & Follows</Text>
                <Text style={styles.benefitDesc}>Follow inspiring voices and build your own network</Text>
              </View>
            </View>
          </View>

          {/* Action CTAs */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.signInButton}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onSignIn();
              }}
            >
              <Text style={styles.signInButtonText}>Sign In to Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButton}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                onSignUp();
              }}
            >
              <Text style={styles.signUpButtonText}>Create New Account (Free)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Continue Browsing as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 24,
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  iconBadgeEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  featureHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  benefitsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  actions: {
    gap: 10,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  signUpButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  signUpButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
