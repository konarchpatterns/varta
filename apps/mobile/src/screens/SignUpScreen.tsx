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
  BackIcon,
  GoogleIcon,
  PhoneIcon,
} from '../components/common/Icons';
import { GoogleAuthModal } from '../components/auth/GoogleAuthModal';
import { colors } from '../theme/colors';
import { ScreenName } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../api/client';

interface SignUpScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSignUpSuccess?: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigate,
  onSignUpSuccess,
}) => {
  const { register, sendPhoneOtp, verifyPhoneSignup } = useAuth();

  // Mode: 'phone' or 'email'
  const [regMode, setRegMode] = useState<'phone' | 'email'>('phone');

  // Shared fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP registration fields
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState('');

  // Email registration fields
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Status & Google Modal
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    if (phoneTimer <= 0) return;
    const interval = setInterval(() => {
      setPhoneTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneTimer]);

  const handleSendPhoneSignupOtp = async () => {
    setErrorMessage('');
    if (!displayName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Please choose a username');
      return;
    }
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsSendingPhoneOtp(true);
    try {
      const res = await sendPhoneOtp({
        countryCode,
        phoneNumber: cleanDigits,
        purpose: 'signup',
      });
      setPhoneMasked(res.message || `Code sent to ${countryCode} ${cleanDigits}`);
      setPhoneStep('verify');
      setPhoneTimer(60);
      setPhoneOtp('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch phone signup OTP');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneSignup = async () => {
    setErrorMessage('');
    if (!phoneOtp.trim() || phoneOtp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    try {
      await verifyPhoneSignup({
        countryCode,
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        otp: phoneOtp.trim(),
        displayName: displayName.trim(),
        username: username.trim().toLowerCase().replace(/^@/, ''),
        password,
      });

      setSuccessMessage('Account created and phone verified successfully!');
      setTimeout(() => {
        if (onSignUpSuccess) onSignUpSuccess();
        onNavigate('home');
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Phone verification failed. Please check the code.');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleEmailSignUp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!displayName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Please choose a username');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsSubmittingEmail(true);
    try {
      const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
      const res = await register({
        displayName: displayName.trim(),
        username: cleanUsername,
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Account successfully created!');
        setTimeout(() => {
          if (onSignUpSuccess) onSignUpSuccess();
          onNavigate('home');
        }, 700);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
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
          {/* Header Row */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={() => onNavigate('signin')}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BackIcon size={22} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.domainBadge}>
              <View style={styles.domainDot} />
              <Text style={styles.domainText}>{getApiBaseUrl().replace(/^https?:\/\//, '')}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Logo with Tagline */}
          <View style={styles.logoContainer}>
            <VartaLogo size="md" showTagline centered />
          </View>

          {/* Titles */}
          <View style={styles.header}>
            <Text style={styles.title}>Join VARTA Today</Text>
            <Text style={styles.subtitle}>India's fastest growing social network</Text>
          </View>

          {/* Google Sign Up Button */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={() => setIsGoogleModalOpen(true)}
          >
            <GoogleIcon size={20} />
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Mode Switch Tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, regMode === 'phone' && styles.modeTabActive]}
              onPress={() => {
                setRegMode('phone');
                setErrorMessage('');
              }}
              activeOpacity={0.8}
            >
              <PhoneIcon size={16} color={regMode === 'phone' ? colors.primary : '#64748B'} />
              <Text style={[styles.modeTabText, regMode === 'phone' && styles.modeTabTextActive]}>
                Phone Sign Up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, regMode === 'email' && styles.modeTabActive]}
              onPress={() => {
                setRegMode('email');
                setErrorMessage('');
              }}
              activeOpacity={0.8}
            >
              <MailIcon size={16} color={regMode === 'email' ? colors.primary : '#64748B'} />
              <Text style={[styles.modeTabText, regMode === 'email' && styles.modeTabTextActive]}>
                Email Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback banners */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Shared Common Info Fields */}
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.inputField}
            placeholder="e.g. Priya Iyer"
            placeholderTextColor="#94A3B8"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.inputLabel}>Choose Username</Text>
          <TextInput
            style={styles.inputField}
            placeholder="e.g. priya_iyer"
            placeholderTextColor="#94A3B8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {/* Mode Specific Fields */}
          {regMode === 'phone' ? (
            <>
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

                  <Text style={styles.inputLabel}>Create Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Min 6 characters"
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
                    style={[styles.primaryButton, isSendingPhoneOtp && { opacity: 0.7 }]}
                    activeOpacity={0.85}
                    disabled={isSendingPhoneOtp}
                    onPress={handleSendPhoneSignupOtp}
                  >
                    {isSendingPhoneOtp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send OTP Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                /* Phone Step 2: Verify OTP */
                <>
                  <View style={styles.verifyHeaderRow}>
                    <Text style={styles.verifySentText}>{phoneMasked || `Code sent to ${phoneNumber}`}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPhoneStep('request');
                        setErrorMessage('');
                      }}
                    >
                      <Text style={styles.editPhoneLink}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Enter 6-Digit Verification Code</Text>
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
                    onPress={handleVerifyPhoneSignup}
                  >
                    {isVerifyingPhoneOtp ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.resendRow}>
                    {phoneTimer > 0 ? (
                      <Text style={styles.timerText}>Resend code in {phoneTimer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendPhoneSignupOtp} disabled={isSendingPhoneOtp}>
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </>
          ) : (
            /* Email Mode */
            <>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.inputField}
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
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
                onPress={handleEmailSignUp}
              >
                {isSubmittingEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => onNavigate('signin')}>
              <Text style={styles.signInLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        visible={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={() => {
          if (onSignUpSuccess) onSignUpSuccess();
          onNavigate('home');
        }}
        title="Sign up with Google"
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 6,
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
  domainText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
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
    marginBottom: 14,
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
    marginBottom: 12,
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
    marginBottom: 12,
  },
  successText: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
    marginTop: 4,
  },
  inputField: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
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
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
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
    marginBottom: 10,
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
    marginTop: 6,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  signInLinkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
});
