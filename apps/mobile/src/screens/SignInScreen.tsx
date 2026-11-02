import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VartaLogo } from '../components/common/VartaLogo';
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  GoogleIcon,
  PhoneIcon,
} from '../components/common/Icons';
import { GoogleAuthModal } from '../components/auth/GoogleAuthModal';
import { colors } from '../theme/colors';
import { ScreenName } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, getApiUrlSource } from '../api/client';

interface SignInScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onLoginSuccess?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const { login, sendPhoneOtp, verifyPhoneLogin, verifyPhoneSignup } = useAuth();

  // Auth Mode: 'phone' or 'email'
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');

  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneTimer, setPhoneTimer] = useState(0);
  // "Send OTP" only proves the phone number; login still needs the code.
  const [otpPurpose, setOtpPurpose] = useState<'login' | 'signup'>('login');
  // When the server has no SMS gateway it returns the code in demo mode
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState('');

  // Email/Password State
  const [identifier, setIdentifier] = useState('aarav_sharma');
  const [password, setPassword] = useState('Varta@2026Secure!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Status & Google Modal
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (phoneTimer <= 0) return;
    const interval = setInterval(() => {
      setPhoneTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneTimer]);

  const requestPhoneOtp = async (purpose: 'login' | 'signup') => {
    setStatusMessage('');
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      setStatusMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSendingPhoneOtp(true);
    try {
      const res: any = await sendPhoneOtp({ countryCode, phoneNumber: cleanDigits, purpose });
      setOtpPurpose(purpose);
      setDevOtp(res?.devOtp || null);
      if (res?.devOtp) {
        // demo mode: prefill so the flow can be completed without an SMS
        setPhoneOtp(res.devOtp);
      }
      setPhoneMasked(res.message || `Code sent to ${countryCode} ${cleanDigits}`);
      setPhoneStep('verify');
      setPhoneTimer(60);
      setPhoneOtp('');
    } catch (err: any) {
      // A number that is not registered yet can still sign up with OTP
      if (purpose === 'login' && /no account/i.test(err?.message || '')) {
        await requestPhoneOtp('signup');
        return;
      }
      setStatusMessage(err?.message || 'Failed to dispatch the verification code');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleSendPhoneOtp = () => requestPhoneOtp('login');

  const handleVerifyPhoneOtp = async () => {
    setStatusMessage('');
    if (!phoneOtp.trim() || phoneOtp.trim().length !== 6) {
      setStatusMessage('Please enter the 6-digit OTP code');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    try {
      if (otpPurpose === 'signup') {
        // New number: create the account, then finish onboarding on the home feed
        await verifyPhoneSignup({
          countryCode,
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          otp: phoneOtp.trim(),
          displayName: `VARTA User ${phoneNumber.slice(-4)}`,
          username: `varta${phoneNumber.replace(/\D/g, '').slice(-6)}`,
          password: `Varta@${phoneNumber.replace(/\D/g, '').slice(-6)}!`,
        });
      } else {
        await verifyPhoneLogin({
          countryCode,
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          otp: phoneOtp.trim(),
        });
      }
      setIsSuccess(true);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        onNavigate('home');
      }, 500);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleEmailSignIn = async () => {
    setStatusMessage('');
    if (!identifier.trim()) {
      setStatusMessage('Please enter your email or username');
      return;
    }
    if (!password) {
      setStatusMessage('Please enter your password');
      return;
    }

    setIsSubmittingEmail(true);
    try {
      const success = await login(identifier.trim(), password);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess();
          onNavigate('home');
        }, 500);
      } else {
        setStatusMessage('Login failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Invalid username or password');
    } finally {
      setIsSubmittingEmail(false);
    }
  };



  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Domain Badge */}
          <View style={styles.topDomainRow}>
            <View style={styles.domainBadge}>
              <View style={styles.domainDot} />
              <Text style={styles.domainText}>{getApiBaseUrl().replace(/^https?:\/\//, '')}</Text>
              {__DEV__ && (
                <Text style={styles.domainSource}>via {getApiUrlSource()}</Text>
              )}
            </View>
          </View>

          {/* Logo with Tagline */}
          <View style={styles.logoContainer}>
            <VartaLogo size="lg" showTagline centered />
          </View>

          {/* Heading */}
          <View style={styles.header}>
            <Text style={styles.title}>Sign in to VARTA</Text>
            <Text style={styles.subtitle}>Baat Sabki — The voice of modern India</Text>
          </View>

          {/* Google 1-Tap Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={() => setIsGoogleModalOpen(true)}
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Tabs: Phone OTP vs Email */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, authMode === 'phone' && styles.modeTabActive]}
              onPress={() => {
                setAuthMode('phone');
                setStatusMessage('');
              }}
              activeOpacity={0.8}
            >
              <PhoneIcon size={16} color={authMode === 'phone' ? colors.primary : '#64748B'} />
              <Text style={[styles.modeTabText, authMode === 'phone' && styles.modeTabTextActive]}>
                Phone OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, authMode === 'email' && styles.modeTabActive]}
              onPress={() => {
                setAuthMode('email');
                setStatusMessage('');
              }}
              activeOpacity={0.8}
            >
              <MailIcon size={16} color={authMode === 'email' ? colors.primary : '#64748B'} />
              <Text style={[styles.modeTabText, authMode === 'email' && styles.modeTabTextActive]}>
                Email / Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Messages */}
          {statusMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{statusMessage}</Text>
            </View>
          ) : null}

          {isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>Signed in successfully! Opening feed...</Text>
            </View>
          ) : null}

          {/* Tab 1: Phone OTP Login */}
          {authMode === 'phone' ? (
            <View style={styles.formCard}>
              {phoneStep === 'request' ? (
                <>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.flagIcon}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="98765 43210"
                      placeholderTextColor="#94A3B8"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={14}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, isSendingPhoneOtp && { opacity: 0.7 }]}
                    activeOpacity={0.85}
                    disabled={isSendingPhoneOtp}
                    onPress={handleSendPhoneOtp}
                  >
                    {isSendingPhoneOtp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send OTP Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                /* Step 2: Verify Phone OTP */
                <>
                  <View style={styles.verifyHeaderRow}>
                    <Text style={styles.verifySentText}>{phoneMasked || `Code sent to ${phoneNumber}`}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPhoneStep('request');
                        setStatusMessage('');
                      }}
                    >
                      <Text style={styles.editPhoneLink}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="• • • • • •"
                    placeholderTextColor="#CBD5E1"
                    value={phoneOtp}
                    onChangeText={setPhoneOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  <TouchableOpacity
                    style={[styles.primaryButton, isVerifyingPhoneOtp && { opacity: 0.7 }]}
                    activeOpacity={0.85}
                    disabled={isVerifyingPhoneOtp}
                    onPress={handleVerifyPhoneOtp}
                  >
                    {isVerifyingPhoneOtp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend Timer */}
                  <View style={styles.resendRow}>
                    {phoneTimer > 0 ? (
                      <Text style={styles.timerText}>Resend code in {phoneTimer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendPhoneOtp} disabled={isSendingPhoneOtp}>
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          ) : (
            /* Tab 2: Email & Password Login */
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Email or Username</Text>
              <View style={styles.inputContainer}>
                <MailIcon size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com or @username"
                  placeholderTextColor="#94A3B8"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <LockIcon size={18} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon size={18} color="#94A3B8" off={!showPassword} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmittingEmail && { opacity: 0.7 }]}
                activeOpacity={0.85}
                disabled={isSubmittingEmail}
                onPress={handleEmailSignIn}
              >
                {isSubmittingEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => onNavigate('signup')}>
              <Text style={styles.createAccountText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        visible={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={() => {
          if (onLoginSuccess) onLoginSuccess();
          onNavigate('home');
        }}
        title="Sign in with Google"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topDomainRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  domainDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  devOtpBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  devOtpText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  domainSource: {
    fontSize: 9,
    color: '#94A3B8',
    marginLeft: 6,
    fontWeight: '600',
  },
  domainText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    fontWeight: '600',
  },
  formCard: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 6,
  },
  flagIcon: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  otpInput: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 14,
  },
  verifyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  verifySentText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  editPhoneLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  timerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  resendLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  demoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  demoPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  demoPillAdmin: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  demoPillAdminText: {
    color: '#1D4ED8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  createAccountText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
});
