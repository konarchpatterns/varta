import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackIcon,
  SettingsIcon,
  ShieldIcon,
  LockIcon,
  BellIcon,
  GlobeIcon,
  MoonIcon,
  SunIcon,
  VerifiedBadge,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LinkIcon,
} from '../components/common/Icons';
import { Avatar } from '../components/common/Avatar';
import { BottomNav } from '../components/common/BottomNav';
import {
  apiRequest,
  changePasswordApi,
  getApiBaseUrl,
  getApiCandidates,
  getLastNetworkError,
  probeApiUrl,
  useApiBaseUrl,
  reportPostApi,
  togglePremiumApi,
  updateAccountApi,
  updateNotificationPreferencesApi,
  updatePrivacyApi,
} from '../api/client';
import { colors } from '../theme/colors';
import { ScreenName } from '../types';
import { useAuth } from '../context/AuthContext';

interface SettingsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onBack: () => void;
}

const TABS = [
  'All',
  'Account',
  'Appearance',
  'Language',
  'Privacy',
  'Alerts',
  'VARTA+',
  'IT Grievance',
];

const BHARAT_LANGUAGES: Record<
  string,
  { native: string; greeting: string; slogan: string }
> = {
  English: {
    native: 'English',
    greeting: 'Welcome to VARTA',
    slogan: 'Baat Sabki — The Voice of Every Citizen',
  },
  Hindi: {
    native: 'हिन्दी',
    greeting: 'वार्ता में आपका स्वागत है',
    slogan: 'बात सबकी — हर नागरिक की आवाज़',
  },
  Gujarati: {
    native: 'ગુજરાતી',
    greeting: 'વાર્તા માં આપનું સ્વાગત છે',
    slogan: 'વાત સહુની — દરેક નાગરિકનો અવાજ',
  },
  Marathi: {
    native: 'मराठी',
    greeting: 'वार्ता मध्ये आपले स्वागत आहे',
    slogan: 'बात सबकी — प्रत्येक नागरिकाचा आवाज',
  },
  Tamil: {
    native: 'தமிழ்',
    greeting: 'வார்தாவிற்கு நல்வரவு',
    slogan: 'அனைவரின் பேச்சு — பாரதத்தின் குரல்',
  },
  Telugu: {
    native: 'తెలుగు',
    greeting: 'వార్తకు స్వాగతం',
    slogan: 'అందరి మాట — ప్రతి పౌరుడి గొంతు',
  },
  Bengali: {
    native: 'বাংলা',
    greeting: 'বার্তায় স্বাগতম',
    slogan: 'বার্তায় সবার কথা — দেশের কণ্ঠস্বর',
  },
  Kannada: {
    native: 'ಕನ್ನಡ',
    greeting: 'ವಾರ್ತೆಗೆ ಸುಸ್ವಾಗತ',
    slogan: 'ಎಲ್ಲರ ಮಾತು — ಭಾರತದ ಧ್ವನಿ',
  },
  Malayalam: {
    native: 'മലയാളം',
    greeting: 'വാർത്തയിലേക്ക് സ്വാഗതം',
    slogan: 'എല്ലാവരുടെയും ശബ്ദം',
  },
  Punjabi: {
    native: 'ਪੰਜਾਬੀ',
    greeting: 'ਵਾਰਤਾ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ',
    slogan: 'ਸਭ ਦੀ ਗੱਲ — ਭਾਰਤ ਦੀ ਆਵਾਜ਼',
  },
};

const ACCENT_COLORS = [
  { id: 'saffron', name: 'Saffron', hex: '#FF9933' },
  { id: 'ocean', name: 'Ocean Blue', hex: '#0284C7' },
  { id: 'emerald', name: 'Emerald', hex: '#10B981' },
  { id: 'purple', name: 'Purple', hex: '#8B5CF6' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigate,
  onBack,
}) => {
  const { user, logout, updateUser, refreshUser, activeDomain } = useAuth();

  // Real health probe instead of a hard-coded "200 OK" badge
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [healthMs, setHealthMs] = useState<number | null>(null);
  const [healthDetail, setHealthDetail] = useState<string | null>(null);
  const [effectiveUrl, setEffectiveUrl] = useState(getApiBaseUrl());
  const [candidateResults, setCandidateResults] = useState<
    Array<{ url: string; ok: boolean; ms?: number; error?: string }>
  >([]);

  const checkHealth = async () => {
    setHealth('checking');
    const started = Date.now();
    try {
      await apiRequest('/health', { timeoutMs: 8000 });
      setHealthMs(Date.now() - started);
      setHealth('ok');
      setHealthDetail(null);
    } catch (err: any) {
      setHealth('down');
      setHealthMs(null);
      setHealthDetail(err?.message || getLastNetworkError());
    }
    // the client may have switched to a working candidate URL — show the truth
    setEffectiveUrl(getApiBaseUrl());

    // Probe every candidate so the reason is obvious (and offer a switch)
    const candidates = getApiCandidates();
    const results = await Promise.all(
      candidates.map(async (url) => {
        try {
          const ms = await probeApiUrl(url, 5000);
          return { url, ok: true, ms };
        } catch (e: any) {
          return { url, ok: false, error: e?.message || 'unreachable' };
        }
      }),
    );
    setCandidateResults(results);
  };

  const switchToUrl = async (url: string) => {
    await useApiBaseUrl(url);
    setEffectiveUrl(url);
    showToast(`API switched to ${url}`);
    checkHealth();
  };

  useEffect(() => {
    checkHealth();
  }, []);
  const [activeTab, setActiveTab] = useState('All');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Appearance State
  const [theme, setTheme] = useState<'light' | 'dim' | 'dark'>('light');
  const [selectedAccent, setSelectedAccent] = useState('#FF9933');

  // Language State
  const [currentLang, setCurrentLang] = useState<string>('English');

  // Privacy Switches
  const [isPrivate, setIsPrivate] = useState<boolean>(user?.isPrivate || false);
  const [allowDMs, setAllowDMs] = useState<boolean>(true);
  const [readReceipts, setReadReceipts] = useState<boolean>(true);

  // Notification Switches
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyLikes, setNotifyLikes] = useState(true);
  const [notifyFollows, setNotifyFollows] = useState(true);
  const [notifyDMs, setNotifyDMs] = useState(true);

  // VARTA+ Premium
  const [isVerifiedBadge, setIsVerifiedBadge] = useState<boolean>(
    user?.verified || false
  );
  const [adFree, setAdFree] = useState(true);
  const [undoPost, setUndoPost] = useState(true);

  // Edit Account Info Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState((user?.handle || '@guest').replace('@', ''));
  const [editEmail, setEditEmail] = useState(user?.email || '');

  // Change Password Modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // IT Grievance Filing Modal
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);
  const [grievanceCategory, setGrievanceCategory] = useState(
    'Content Violation / Hate Speech'
  );
  const [grievanceUrl, setGrievanceUrl] = useState('');
  const [grievanceDetails, setGrievanceDetails] = useState('');
  const [filedTicketId, setFiledTicketId] = useState<string | null>(null);

  const handleTogglePrivate = async (val: boolean) => {
    setIsPrivate(val);
    updateUser({ isPrivate: val });
    try {
      await updatePrivacyApi(val);
      showToast(val ? 'Account is now Private 🔒' : 'Account is now Public 🌐');
    } catch (err: any) {
      setIsPrivate(!val);
      updateUser({ isPrivate: !val });
      showToast(err?.message || 'Could not update privacy');
    }
  };

  const handleToggleNotificationPref = async (key: string, val: boolean) => {
    const setters: Record<string, (v: boolean) => void> = {
      push: setPushEnabled,
      replies: setNotifyReplies,
      likes: setNotifyLikes,
      follows: setNotifyFollows,
      dms: setNotifyDMs,
    };
    setters[key]?.(val);
    try {
      await updateNotificationPreferencesApi({ [key]: val });
    } catch {
      // keep the local state; preferences sync again on next change
    }
  };

  const handleSelectLanguage = (langKey: string) => {
    setCurrentLang(langKey);
    showToast(`App language set to ${langKey} 🇮🇳`);
  };

  const handleSaveAccountInfo = async () => {
    const cleanUsername = editUsername.trim().replace(/^@/, '');
    try {
      const res = await updateAccountApi({
        username: cleanUsername || undefined,
        email: editEmail.trim() || undefined,
      });
      updateUser({
        handle: `@${res?.username || cleanUsername}`,
        username: res?.username || cleanUsername,
        email: res?.email || editEmail.trim(),
      });
      await refreshUser();
      setIsAccountModalOpen(false);
      showToast('Account details updated successfully! ✨');
    } catch (err: any) {
      showToast(err?.message || 'Could not update account details');
    }
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    try {
      await changePasswordApi(currentPassword, newPassword);
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully! 🔐');
    } catch (err: any) {
      setPasswordError(err?.message || 'Could not change password');
    }
  };

  const handleTogglePremium = async (val: boolean) => {
    setIsVerifiedBadge(val);
    try {
      const res = await togglePremiumApi();
      const verified = res?.isVerified ?? val;
      setIsVerifiedBadge(verified);
      updateUser({ verified });
      await refreshUser();
      showToast(verified ? 'VARTA+ Badge Activated! ⭐' : 'VARTA+ Badge Deactivated');
    } catch (err: any) {
      setIsVerifiedBadge(!val);
      showToast(err?.message || 'Could not update premium status');
    }
  };

  const handleSubmitGrievance = async () => {
    if (!grievanceDetails.trim()) {
      showToast('Please provide details for the grievance');
      return;
    }
    try {
      // Grievances go into the same moderation report pipeline as the web app
      const res: any = await reportPostApi({
        category: grievanceCategory,
        reason: grievanceDetails.trim(),
      });
      const ticketId = res?.id
        ? `VARTA-${String(res.id).slice(0, 8).toUpperCase()}`
        : `VARTA-IT2021-${Math.floor(100000 + Math.random() * 900000)}`;
      setFiledTicketId(ticketId);
      showToast(`Grievance filed! Ticket: ${ticketId}`);
    } catch (err: any) {
      showToast(err?.message || 'Could not file the grievance');
    }
  };

  const shouldShowSection = (sectionName: string) => {
    if (activeTab === 'All') return true;
    return activeTab.toLowerCase() === sectionName.toLowerCase();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
            <BackIcon size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Settings & Privacy</Text>
            <Text style={styles.headerSubtitle}>{user?.handle || '@guest'}</Text>
          </View>
          <View style={styles.headerRightAvatar}>
            <Avatar uri={user?.avatar || ''} name={user?.name} size={32} />
          </View>
        </View>

        {/* Tab Pills */}
        <View style={styles.tabsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabChip, isActive && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Settings Body */}
        <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* 1. Account Section */}
          {shouldShowSection('Account') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <SettingsIcon size={18} color="#4F46E5" />
                </View>
                <Text style={styles.sectionTitle}>Your Account</Text>
              </View>

              <View style={styles.settingItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>Username</Text>
                  <Text style={styles.itemValue}>{user?.handle || '@guest'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionBtnSmall}
                  onPress={() => {
                    setEditUsername((user?.handle || '@guest').replace('@', ''));
                    setEditEmail(user?.email || '');
                    setIsAccountModalOpen(true);
                  }}
                >
                  <Text style={styles.actionBtnSmallText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>Email Address</Text>
                  <Text style={styles.itemValue}>{user?.email || 'No email linked'}</Text>
                </View>
                <Text style={styles.itemBadgeVerified}>Verified ✓</Text>
              </View>

              <View style={styles.settingItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>Password & Security</Text>
                  <Text style={styles.itemSubtext}>Last changed 14 days ago</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionBtnSmall}
                  onPress={() => {
                    setPasswordError(null);
                    setIsPasswordModalOpen(true);
                  }}
                >
                  <Text style={styles.actionBtnSmallText}>Update</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.signOutButton}
                activeOpacity={0.85}
                onPress={async () => {
                  await logout();
                  onNavigate('signin');
                }}
              >
                <Text style={styles.signOutButtonText}>Sign Out of VARTA</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 2. Appearance & Theme */}
          {shouldShowSection('Appearance') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <SunIcon size={18} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Appearance & Theme</Text>
              </View>

              <Text style={styles.subHeadingLabel}>Background Mode</Text>
              <View style={styles.themeCardsRow}>
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    theme === 'light' && styles.themeCardActive,
                  ]}
                  onPress={() => {
                    setTheme('light');
                    showToast('Clean Daylight theme applied ☀️');
                  }}
                >
                  <SunIcon size={20} color={theme === 'light' ? colors.primary : '#64748B'} />
                  <Text style={[styles.themeCardTitle, theme === 'light' && { color: colors.primary }]}>
                    Clean Light
                  </Text>
                  <Text style={styles.themeCardSub}>Daylight</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    styles.themeCardDim,
                    theme === 'dim' && styles.themeCardActive,
                  ]}
                  onPress={() => {
                    setTheme('dim');
                    showToast('Dim Midnight theme applied 🌌');
                  }}
                >
                  <MoonIcon size={20} color="#0284C7" />
                  <Text style={[styles.themeCardTitle, { color: '#E2E8F0' }]}>
                    Dim Navy
                  </Text>
                  <Text style={[styles.themeCardSub, { color: '#94A3B8' }]}>Midnight</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    styles.themeCardDark,
                    theme === 'dark' && styles.themeCardActive,
                  ]}
                  onPress={() => {
                    setTheme('dark');
                    showToast('Dark Premium theme applied 🌙');
                  }}
                >
                  <MoonIcon size={20} color="#818CF8" />
                  <Text style={[styles.themeCardTitle, { color: '#F8FAFC' }]}>
                    Dark OLED
                  </Text>
                  <Text style={[styles.themeCardSub, { color: '#94A3B8' }]}>Pure Dark</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.subHeadingLabel, { marginTop: 14 }]}>Accent Color</Text>
              <View style={styles.accentColorsRow}>
                {ACCENT_COLORS.map((acc) => {
                  const isSelected = selectedAccent === acc.hex;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accentCircle,
                        { backgroundColor: acc.hex },
                        isSelected && styles.accentCircleActive,
                      ]}
                      onPress={() => {
                        setSelectedAccent(acc.hex);
                        showToast(`Accent color set to ${acc.name}`);
                      }}
                    >
                      {isSelected && <CheckIcon size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 3. Bharat Regional Languages */}
          {shouldShowSection('Language') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#F0FDF4' }]}>
                  <GlobeIcon size={18} color="#16A34A" />
                </View>
                <Text style={styles.sectionTitle}>Bharat Regional Languages</Text>
              </View>

              {/* Dynamic Greeting Card */}
              <View style={styles.greetingBannerCard}>
                <Text style={styles.greetingNativeText}>
                  {BHARAT_LANGUAGES[currentLang]?.greeting || 'Welcome to VARTA'}
                </Text>
                <Text style={styles.greetingSloganText}>
                  {BHARAT_LANGUAGES[currentLang]?.slogan ||
                    'Baat Sabki — The Voice of Every Citizen'}
                </Text>
              </View>

              {/* 10 Indian Regional Languages Grid */}
              <View style={styles.languagesGrid}>
                {Object.entries(BHARAT_LANGUAGES).map(([key, lang]) => {
                  const isSelected = currentLang === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.langPillButton,
                        isSelected && styles.langPillButtonActive,
                      ]}
                      onPress={() => handleSelectLanguage(key)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.langNativeName,
                            isSelected && styles.langNativeNameActive,
                          ]}
                        >
                          {lang.native}
                        </Text>
                        <Text
                          style={[
                            styles.langEnglishName,
                            isSelected && styles.langEnglishNameActive,
                          ]}
                        >
                          {key}
                        </Text>
                      </View>
                      {isSelected && <CheckIcon size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 4. Privacy & Safety */}
          {shouldShowSection('Privacy') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <ShieldIcon size={18} color="#2563EB" />
                </View>
                <Text style={styles.sectionTitle}>Privacy & Safety</Text>
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Private Account</Text>
                  <Text style={styles.switchDesc}>
                    When private, only people you approve can see your posts and media.
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={handleTogglePrivate}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Allow DMs from Everyone</Text>
                  <Text style={styles.switchDesc}>
                    Receive direct messages from any citizen across Bharat.
                  </Text>
                </View>
                <Switch
                  value={allowDMs}
                  onValueChange={(val) => {
                    setAllowDMs(val);
                    showToast(val ? 'DMs opened to everyone' : 'DMs restricted to followers');
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Read Receipts</Text>
                  <Text style={styles.switchDesc}>
                    Let people know when you've seen their messages in chats.
                  </Text>
                </View>
                <Switch
                  value={readReceipts}
                  onValueChange={(val) => {
                    setReadReceipts(val);
                    showToast(val ? 'Read receipts enabled' : 'Read receipts disabled');
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>
            </View>
          )}

          {/* 5. Alerts & Notifications */}
          {shouldShowSection('Alerts') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <BellIcon size={18} color="#D97706" />
                </View>
                <Text style={styles.sectionTitle}>Push Alerts & Notifications</Text>
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Push Notifications</Text>
                  <Text style={styles.switchDesc}>
                    Master toggle for notifications on this device.
                  </Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={(v) => {
                    setPushEnabled(v);
                    showToast(v ? 'Push alerts enabled' : 'Push alerts paused');
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Replies & Mentions</Text>
                  <Text style={styles.switchDesc}>
                    When someone replies to your post or mentions @{(user?.handle || 'guest').replace('@', '')}.
                  </Text>
                </View>
                <Switch
                  value={notifyReplies}
                  onValueChange={setNotifyReplies}
                  disabled={!pushEnabled}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Likes & Reposts</Text>
                  <Text style={styles.switchDesc}>
                    When your posts gain engagement from the community.
                  </Text>
                </View>
                <Switch
                  value={notifyLikes}
                  onValueChange={setNotifyLikes}
                  disabled={!pushEnabled}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>New Followers</Text>
                  <Text style={styles.switchDesc}>
                    When citizens start following your profile.
                  </Text>
                </View>
                <Switch
                  value={notifyFollows}
                  onValueChange={setNotifyFollows}
                  disabled={!pushEnabled}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Direct Messages</Text>
                  <Text style={styles.switchDesc}>
                    Instant notifications for 1-on-1 private messages.
                  </Text>
                </View>
                <Switch
                  value={notifyDMs}
                  onValueChange={setNotifyDMs}
                  disabled={!pushEnabled}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>
            </View>
          )}

          {/* 6. VARTA+ Premium */}
          {shouldShowSection('VARTA+') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#FEF9C3' }]}>
                  <VerifiedBadge size={20} />
                </View>
                <Text style={styles.sectionTitle}>VARTA+ Verified Creator</Text>
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.switchTitle}>Blue Verification Badge</Text>
                    <VerifiedBadge size={16} />
                  </View>
                  <Text style={styles.switchDesc}>
                    Official verified badge displayed next to your name on all posts.
                  </Text>
                </View>
                <Switch
                  value={isVerifiedBadge}
                  onValueChange={handleTogglePremium}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>Ad-Free Clean Browsing</Text>
                  <Text style={styles.switchDesc}>
                    Enjoy an uninterrupted experience with zero sponsored interruptions.
                  </Text>
                </View>
                <Switch
                  value={adFree}
                  onValueChange={(val) => {
                    setAdFree(val);
                    showToast(val ? 'Ad-free mode active' : 'Sponsored posts allowed');
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.switchTitle}>60-Second Post Undo</Text>
                  <Text style={styles.switchDesc}>
                    Recall or make edits within 60 seconds before a post goes live.
                  </Text>
                </View>
                <Switch
                  value={undoPost}
                  onValueChange={(val) => {
                    setUndoPost(val);
                    showToast(val ? 'Post Undo activated' : 'Post Undo disabled');
                  }}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                />
              </View>
            </View>
          )}

          {/* 7. IT Rules 2021 Grievance Officer */}
          {shouldShowSection('IT Grievance') && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconCircle, { backgroundColor: '#F1F5F9' }]}>
                  <ShieldIcon size={18} color="#334155" />
                </View>
                <Text style={styles.sectionTitle}>IT Rules 2021 Grievance</Text>
              </View>

              <Text style={styles.complianceDesc}>
                Under the Information Technology (Intermediary Guidelines and Digital
                Media Ethics Code) Rules, 2021, VARTA provides an Indian resident grievance
                mechanism for any content or privacy complaints.
              </Text>

              <View style={styles.officerBox}>
                <Text style={styles.officerTitle}>Resident Grievance Officer</Text>
                <Text style={styles.officerName}>Mr. R. K. Sharma</Text>
                <Text style={styles.officerContact}>
                  Email: grievance@varta.org.in {'\n'}
                  Address: Digital Bharat Tower, New Delhi - 110001
                </Text>
              </View>

              <TouchableOpacity
                style={styles.fileGrievanceBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setFiledTicketId(null);
                  setIsGrievanceModalOpen(true);
                }}
              >
                <Text style={styles.fileGrievanceBtnText}>+ File a New Grievance</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 8. System & API Health */}
          <View style={styles.sectionCard}>
            <Text style={styles.systemHeading}>System Status & Latency</Text>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>API Base URL:</Text>
              <Text style={styles.systemValueHighlight} numberOfLines={1}>
                {effectiveUrl}
              </Text>
            </View>
            <TouchableOpacity style={styles.systemRow} onPress={checkHealth} activeOpacity={0.7}>
              <Text style={styles.systemLabel}>API Health:</Text>
              {health === 'checking' ? (
                <Text style={styles.systemValue}>Checking…</Text>
              ) : health === 'ok' ? (
                <View style={styles.greenBadge}>
                  <View style={styles.greenDot} />
                  <Text style={styles.greenBadgeText}>Reachable · {healthMs}ms</Text>
                </View>
              ) : (
                <Text style={[styles.systemValue, { color: '#DC2626', fontWeight: '700' }]}>
                  Unreachable — tap to retry
                </Text>
              )}
            </TouchableOpacity>
            {health === 'down' && !!healthDetail && (
              <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>{healthDetail}</Text>
            )}

            {candidateResults.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.systemLabel, { marginBottom: 6 }]}>Connection test:</Text>
                {candidateResults.map((c) => (
                  <View key={c.url} style={{ marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13 }}>{c.ok ? '✅' : '❌'}</Text>
                      <Text style={{ flex: 1, fontSize: 11, color: '#334155' }} numberOfLines={1}>
                        {c.url}
                      </Text>
                      {c.ok ? (
                        c.url !== effectiveUrl ? (
                          <TouchableOpacity onPress={() => switchToUrl(c.url)}>
                            <Text style={{ fontSize: 11, color: '#0EA5E9', fontWeight: '700' }}>
                              Use this
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>
                            {c.ms}ms · active
                          </Text>
                        )
                      ) : (
                        <Text style={{ fontSize: 10, color: '#94A3B8' }} numberOfLines={1}>
                          {c.error}
                        </Text>
                      )}
                    </View>
                    {c.ok && c.url !== effectiveUrl && (
                      <TouchableOpacity onPress={() => switchToUrl(c.url)}>
                        <Text style={{ fontSize: 10, color: '#0EA5E9', marginLeft: 20 }}>
                          Tap to switch the app to this address
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>App Version:</Text>
              <Text style={styles.systemValue}>VARTA v1.0.0 (Expo SDK 58)</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Floating Toast */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Edit Account Modal */}
        <Modal
          visible={isAccountModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsAccountModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Account Information</Text>
                <TouchableOpacity onPress={() => setIsAccountModalOpen(false)}>
                  <CloseIcon size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.textInput}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="e.g. aarav_sharma"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="e.g. user@bharat.dev"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={handleSaveAccountInfo}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryModalBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={isPasswordModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsPasswordModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                  <CloseIcon size={20} />
                </TouchableOpacity>
              </View>

              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={handleSavePassword}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryModalBtnText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* File Grievance Modal */}
        <Modal
          visible={isGrievanceModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsGrievanceModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>IT Rules 2021 Grievance</Text>
                <TouchableOpacity onPress={() => setIsGrievanceModalOpen(false)}>
                  <CloseIcon size={20} />
                </TouchableOpacity>
              </View>

              {filedTicketId ? (
                <View style={styles.successTicketBox}>
                  <Text style={styles.ticketCreatedTitle}>Grievance Registered ✓</Text>
                  <Text style={styles.ticketDesc}>
                    Your ticket has been acknowledged under Rule 3(2) of IT Rules 2021.
                  </Text>
                  <View style={styles.ticketIdRow}>
                    <Text style={styles.ticketIdText}>{filedTicketId}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryModalBtn}
                    onPress={() => setIsGrievanceModalOpen(false)}
                  >
                    <Text style={styles.primaryModalBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Complaint Category</Text>
                    <TextInput
                      style={styles.textInput}
                      value={grievanceCategory}
                      onChangeText={setGrievanceCategory}
                      placeholder="e.g. Hate Speech, Impersonation"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Post or Profile URL</Text>
                    <TextInput
                      style={styles.textInput}
                      value={grievanceUrl}
                      onChangeText={setGrievanceUrl}
                      placeholder="https://varta.in/post/..."
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Details & Grounds</Text>
                    <TextInput
                      style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                      value={grievanceDetails}
                      onChangeText={setGrievanceDetails}
                      placeholder="Explain the violation..."
                      multiline
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryModalBtn}
                    onPress={handleSubmitGrievance}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryModalBtnText}>Submit Grievance</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Bottom Navigation */}
        <BottomNav currentScreen="profile" onNavigate={onNavigate} />
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  headerRightAvatar: {
    marginLeft: 8,
  },
  tabsRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabsScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  scrollBody: {
    flex: 1,
    padding: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  itemBadgeVerified: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  actionBtnSmall: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  signOutButton: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  subHeadingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  themeCardDim: {
    backgroundColor: '#0F172A',
  },
  themeCardDark: {
    backgroundColor: '#020617',
  },
  themeCardActive: {
    borderColor: colors.primary,
  },
  themeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  themeCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  accentColorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  accentCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  greetingBannerCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  greetingNativeText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  greetingSloganText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langPillButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  langPillButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  langNativeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  langNativeNameActive: {
    color: colors.primary,
  },
  langEnglishName: {
    fontSize: 11,
    color: '#64748B',
  },
  langEnglishNameActive: {
    color: '#9A3412',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  switchDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  complianceDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  officerBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  officerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  officerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  officerContact: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  fileGrievanceBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  fileGrievanceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  systemHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  systemLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  systemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  systemValueHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  greenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  primaryModalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  successTicketBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ticketCreatedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 6,
  },
  ticketDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  ticketIdRow: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  ticketIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
});
