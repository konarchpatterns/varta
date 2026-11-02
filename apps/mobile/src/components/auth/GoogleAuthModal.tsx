import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { GoogleIcon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';

interface GoogleAccount {
  displayName: string;
  email: string;
  avatarUrl: string;
  googleId: string;
}

const PRESET_ACCOUNTS: GoogleAccount[] = [
  {
    displayName: 'Priya Patel',
    email: 'priya.patel@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
    googleId: 'g_1092837461928301',
  },
  {
    displayName: 'Aarav Sharma',
    email: 'aarav.sharma@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
    googleId: 'g_1092837461928302',
  },
  {
    displayName: 'Ananya Verma',
    email: 'ananya.verma.tech@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces',
    googleId: 'g_1092837461928303',
  },
];

interface GoogleAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  title = 'Sign in with Google',
}) => {
  const { googleAuth } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom account mode
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  const handleSelectAccount = async (account: {
    displayName: string;
    email: string;
    avatarUrl?: string;
    googleId?: string;
  }) => {
    setSelectedEmail(account.email);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await googleAuth({
        displayName: account.displayName,
        email: account.email,
        avatarUrl: account.avatarUrl,
        googleId: account.googleId,
      });
      setIsSubmitting(false);
      onClose();
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed');
      setIsSubmitting(false);
      setSelectedEmail(null);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customName.trim() || !customEmail.trim() || !customEmail.includes('@')) {
      setErrorMessage('Please provide a valid Google Name and Email address');
      return;
    }

    const randomGId = `g_${Date.now()}`;
    await handleSelectAccount({
      displayName: customName.trim(),
      email: customEmail.trim().toLowerCase(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customName)}`,
      googleId: randomGId,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.googleIconWrapper}>
              <GoogleIcon size={26} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>to continue to VARTA — Baat Sabki</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {!isCustomMode ? (
              <>
                <Text style={styles.sectionLabel}>Choose an account</Text>
                {PRESET_ACCOUNTS.map((acc) => {
                  const isThisAccount = selectedEmail === acc.email;
                  return (
                    <TouchableOpacity
                      key={acc.email}
                      style={[
                        styles.accountRow,
                        isThisAccount && styles.accountRowActive,
                      ]}
                      disabled={isSubmitting}
                      activeOpacity={0.7}
                      onPress={() => handleSelectAccount(acc)}
                    >
                      <Image source={{ uri: acc.avatarUrl }} style={styles.accountAvatar} />
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{acc.displayName}</Text>
                        <Text style={styles.accountEmail}>{acc.email}</Text>
                      </View>
                      {isSubmitting && isThisAccount ? (
                        <ActivityIndicator size="small" color="#4285F4" />
                      ) : (
                        <Text style={styles.selectArrow}>›</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Use another account option */}
                <TouchableOpacity
                  style={styles.addAccountRow}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                  onPress={() => {
                    setIsCustomMode(true);
                    setErrorMessage(null);
                  }}
                >
                  <View style={styles.addAccountIconBox}>
                    <Text style={styles.addAccountPlus}>+</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.addAccountTitle}>Use another Google account</Text>
                    <Text style={styles.addAccountSub}>Sign in with your Gmail or Google Workspace</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              /* Custom Account Form */
              <View style={styles.customForm}>
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => {
                    setIsCustomMode(false);
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.backLinkText}>← Back to account list</Text>
                </TouchableOpacity>

                <Text style={styles.formLabel}>Your Google Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vikram Malhotra"
                  placeholderTextColor="#94A3B8"
                  value={customName}
                  onChangeText={setCustomName}
                  autoCapitalize="words"
                />

                <Text style={styles.formLabel}>Your Google Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. vikram.malhotra@gmail.com"
                  placeholderTextColor="#94A3B8"
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.continueButton, isSubmitting && { opacity: 0.7 }]}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                  onPress={handleCustomSubmit}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.continueButtonText}>Continue with Google</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.privacyNote}>
              To continue, Google will share your name, email address, language preference, and profile
              picture with VARTA.
            </Text>
          </ScrollView>

          {/* Cancel button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  googleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  body: {
    maxHeight: 380,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  accountRowActive: {
    borderColor: '#4285F4',
    backgroundColor: '#EFF6FF',
  },
  accountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  selectArrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300',
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  addAccountIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountPlus: {
    fontSize: 20,
    color: '#4285F4',
    fontWeight: '700',
    marginTop: -2,
  },
  addAccountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  addAccountSub: {
    fontSize: 11,
    color: '#64748B',
  },
  customForm: {
    paddingVertical: 4,
  },
  backLink: {
    marginBottom: 12,
  },
  backLinkText: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  continueButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  privacyNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
