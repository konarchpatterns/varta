import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { ScreenName } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ScreenSwitcherProps {
  currentScreen: ScreenName;
  onSelectScreen: (screen: ScreenName) => void;
}

const SCREENS: { id: ScreenName; title: string; subtitle: string; icon: string }[] = [
  { id: 'onboarding', title: '1. Onboarding', subtitle: 'Splash & Get Started', icon: '✨' },
  { id: 'signin', title: '2. Sign In', subtitle: 'Phone OTP, Google & Pass', icon: '🔐' },
  { id: 'signup', title: '2b. Sign Up', subtitle: 'Phone & Google Registration', icon: '📝' },
  { id: 'home', title: '3. Home Feed', subtitle: 'Infinite Feed & Group Clicks', icon: '🏠' },
  { id: 'explore', title: '4. Explore', subtitle: 'Trending & Who to Follow', icon: '🧭' },
  { id: 'post-detail', title: '5. Post Detail', subtitle: 'Thread & Community Badge', icon: '💬' },
  { id: 'profile', title: '6. Profile', subtitle: 'Banner, Bio & Sign Out', icon: '👤' },
  { id: 'create-post', title: '7. Create Post', subtitle: 'Composer & Media Upload', icon: '✏️' },
  { id: 'messages', title: '8. Messages', subtitle: 'Direct Chats & Threads', icon: '✉️' },
  { id: 'notifications', title: '9. Notifications', subtitle: 'Activity & Mentions', icon: '🔔' },
  { id: 'communities', title: '10. Communities', subtitle: 'Bharat Groups Browser', icon: '👥' },
  { id: 'community-detail', title: '10b. Community Page', subtitle: 'Banner, Posts & Rules', icon: '🏛️' },
  { id: 'search', title: '11. Search', subtitle: 'Live Topic & Posts Filter', icon: '🔍' },
  { id: 'settings', title: '12. Settings & Privacy', subtitle: 'Appearance, Privacy & Languages', icon: '⚙️' },
];

export const ScreenSwitcher: React.FC<ScreenSwitcherProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const { isAuthenticated } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      {/* Floating Trigger Button */}
      <TouchableOpacity
        style={styles.floatingTrigger}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.triggerBadge}>14 Screens</Text>
        <Text style={styles.triggerText}>📱 Switch Screen ▾</Text>
      </TouchableOpacity>

      {/* Screen Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>VARTA Mobile App Screens</Text>
                <Text style={styles.modalSubtitle}>
                  Select any of the 12 screens from the design & feature suite
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Screen List */}
            <ScrollView style={styles.screenList} showsVerticalScrollIndicator={false}>
              {SCREENS.map((s) => {
                const isCurrent = currentScreen === s.id;
                const isAuthScreen = ['onboarding', 'signin', 'signup'].includes(s.id);
                const isProtectedScreen = ['messages', 'profile', 'create-post', 'notifications', 'communities', 'community-detail'].includes(s.id);
                const isBlockedAuth = isAuthenticated && isAuthScreen;
                const isBlockedGuest = !isAuthenticated && isProtectedScreen;

                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.screenItem,
                      isCurrent && styles.screenItemActive,
                      isBlockedAuth && styles.screenItemBlocked,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isBlockedAuth) {
                        alert('You are already signed in to VARTA! Authenticated users cannot access onboarding or login pages. Sign out from your Profile to view them.');
                        return;
                      }
                      setModalVisible(false);
                      onSelectScreen(s.id);
                    }}
                  >
                    <Text style={styles.screenIcon}>{s.icon}</Text>
                    <View style={styles.screenTextContainer}>
                      <Text
                        style={[
                          styles.screenTitle,
                          isCurrent && styles.screenTitleActive,
                          isBlockedAuth && styles.screenTitleBlocked,
                        ]}
                      >
                        {s.title}
                      </Text>
                      <Text style={styles.screenSub}>
                        {isBlockedAuth
                          ? 'Blocked for logged-in users'
                          : isBlockedGuest
                          ? 'Requires login or signup'
                          : s.subtitle}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>ACTIVE</Text>
                      </View>
                    ) : isBlockedAuth ? (
                      <View style={styles.lockedBadge}>
                        <Text style={styles.lockedBadgeText}>🔒 BLOCKED</Text>
                      </View>
                    ) : isBlockedGuest ? (
                      <View style={styles.loginReqBadge}>
                        <Text style={styles.loginReqBadgeText}>🔐 LOGIN REQ</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingTrigger: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 16 : 82,
    left: 14,
    zIndex: 9999,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  triggerBadge: {
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  triggerText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  screenList: {
    paddingVertical: 10,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  screenItemActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  screenIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  screenTextContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  screenTitleActive: {
    color: colors.primary,
  },
  screenSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  screenItemBlocked: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  screenTitleBlocked: {
    color: '#94A3B8',
  },
  lockedBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockedBadgeText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
  },
  loginReqBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  loginReqBadgeText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '800',
  },
});
