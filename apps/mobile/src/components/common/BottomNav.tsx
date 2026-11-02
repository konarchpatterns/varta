import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, ExploreIcon, PlusIcon, MessagesIcon, ProfileIcon } from './Icons';
import { colors } from '../../theme/colors';
import { ScreenName } from '../../types';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: bottomInset,
          height: 56 + bottomInset,
        },
      ]}
    >
      {/* Home */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onNavigate('home')}
      >
        <HomeIcon active={currentScreen === 'home'} size={24} />
        <Text style={[styles.tabLabel, currentScreen === 'home' && styles.activeTabLabel]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Explore */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onNavigate('explore')}
      >
        <ExploreIcon active={currentScreen === 'explore' || currentScreen === 'search'} size={24} />
        <Text
          style={[
            styles.tabLabel,
            (currentScreen === 'explore' || currentScreen === 'search') && styles.activeTabLabel,
          ]}
        >
          Explore
        </Text>
      </TouchableOpacity>

      {/* Floating Center (+) Action Button */}
      <View style={styles.centerButtonWrapper}>
        <TouchableOpacity
          style={styles.centerButton}
          activeOpacity={0.85}
          onPress={() => onNavigate('create-post')}
        >
          <PlusIcon size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onNavigate('messages')}
      >
        <View style={styles.iconWithBadge}>
          <MessagesIcon active={currentScreen === 'messages'} size={24} />
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>2</Text>
          </View>
        </View>
        <Text style={[styles.tabLabel, currentScreen === 'messages' && styles.activeTabLabel]}>
          Messages
        </Text>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => onNavigate('profile')}
      >
        <ProfileIcon
          active={
            currentScreen === 'profile' ||
            currentScreen === 'bookmarks' ||
            currentScreen === 'settings'
          }
          size={24}
        />
        <Text style={[styles.tabLabel, currentScreen === 'profile' && styles.activeTabLabel]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    width: 60,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  iconWithBadge: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
