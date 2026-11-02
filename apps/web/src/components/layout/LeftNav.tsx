'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  Users,
  Sparkles,
  FileText,
  User,
  MoreHorizontal,
  PenTool,
  LogOut,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { VartaLogo } from '../common/VartaLogo';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';

interface LeftNavProps {
  onOpenCompose?: () => void;
}

export const LeftNav: React.FC<LeftNavProps> = ({ onOpenCompose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Fetch unread direct messages count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unread-messages-count'],
    queryFn: () => apiRequest('/messages/unread-count'),
    enabled: !!user,
    refetchInterval: 6000,
  });

  const unreadMessagesCount = unreadData?.count || 0;

  // Fetch unread notifications count
  const { data: unreadNotificationsData } = useQuery<{ count: number; unreadCount: number }>({
    queryKey: ['unread-notifications-count'],
    queryFn: () => apiRequest('/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadNotificationsCount =
    unreadNotificationsData?.count ?? unreadNotificationsData?.unreadCount ?? 0;

  // Real-time WebSocket listener for unread count & notifications
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleUnreadCount = (data: { count: number }) => {
      queryClient.setQueryData(['unread-messages-count'], { count: data.count });
    };

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    };

    socket.on('messages:unread_count', handleUnreadCount);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('messages:unread_count', handleUnreadCount);
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, queryClient]);

  const navItems = [
    { label: 'Home', href: user ? '/home' : '/', icon: Home },
    { label: 'Explore', href: '/explore', icon: Search },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: Mail,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { label: 'Communities', href: '/communities', icon: Users },
    { label: 'Premium', href: '/settings?tab=premium', icon: Sparkles },
    { label: 'Lists', href: '/bookmarks', icon: FileText },
    {
      label: 'Profile',
      href: user ? `/${user.username}` : '/login',
      icon: User,
    },
    { label: 'More', href: '/settings', icon: MoreHorizontal },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
    navItems.push({ label: 'Admin', href: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className="sticky top-0 h-screen w-20 xl:w-[270px] hidden lg:flex flex-col justify-between py-4 px-2 xl:px-4 border-r border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#050B14] z-30 select-none overflow-y-auto">
      <div className="flex flex-col gap-3">
        {/* Brand Logo */}
        <Link
          href={user ? '/home' : '/'}
          className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-[#0B1422] rounded-2xl transition w-fit xl:w-full"
        >
          <VartaLogo
            size={36}
            showText={true}
            showTagline={true}
            textClassName="hidden xl:flex"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const currentTab = searchParams?.get('tab');
            const isActive = item.href.includes('?tab=')
              ? pathname === item.href.split('?')[0] && currentTab === 'premium'
              : item.href === '/settings'
              ? pathname === '/settings' && currentTab !== 'premium'
              : pathname === item.href ||
                (item.href !== '/home' && item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl font-medium transition text-[15px] ${
                  isActive
                    ? 'bg-[#FF9933] text-white font-semibold shadow-md shadow-[#FF9933]/25'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0B1422]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Icon
                      size={22}
                      className={
                        isActive
                          ? 'text-white stroke-[2.5]'
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      }
                    />
                    {/* Collapsed sidebar badge indicator */}
                    {item.badge && !isActive && (
                      <span className="xl:hidden absolute -top-1.5 -right-2 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#FF9933] text-white text-[10px] font-extrabold shadow-sm animate-in zoom-in-75 duration-200">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="hidden xl:inline">{item.label}</span>
                </div>

                {/* Expanded desktop notification badge */}
                {item.badge && !isActive && (
                  <span className="hidden xl:flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#FF9933] text-white text-[11px] font-bold shadow-md shadow-[#FF9933]/30 animate-in zoom-in-75 duration-200">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Prominent Orange Post Button */}
        <button
          onClick={onOpenCompose}
          className="mt-2 w-full py-3.5 px-4 bg-[#FF9933] hover:bg-[#E68525] text-white font-bold rounded-2xl shadow-lg shadow-[#FF9933]/25 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98]"
        >
          <PenTool size={18} className="stroke-[2.5]" />
          <span className="hidden xl:inline text-base">Post</span>
        </button>
      </div>

      {/* Bottom Section: User Profile & Upgrade Card */}
      <div className="flex flex-col gap-3 mt-4">
        {/* Upgrade to VARTA+ Banner Card */}
        <div className="hidden xl:flex flex-col gap-2 p-3.5 rounded-2xl bg-amber-500/10 dark:bg-[#0B1422] border border-amber-500/30 dark:border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-[#FF9933]" />
            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
              Upgrade to VARTA+
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
            Get premium features, early access and support VARTA.
          </p>
          <Link
            href="/settings?tab=premium"
            className="w-full text-center py-2 bg-[#FF9933] hover:bg-[#E68525] text-white font-bold rounded-xl text-xs transition shadow-md shadow-[#FF9933]/25 block"
          >
            Upgrade
          </Link>
        </div>

        {/* User Profile Pill */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#0B1422] border border-transparent hover:border-slate-200 dark:hover:border-[#1E293B] transition"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-[#101D2D] flex items-center justify-center text-[#FF9933] font-bold shrink-0 overflow-hidden ring-1 ring-slate-200 dark:ring-[#1E293B]">
                  {user.profile?.avatarUrl ? (
                    <img
                      src={user.profile.avatarUrl}
                      alt={user.username}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-left overflow-hidden">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {user.profile?.displayName || user.username}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    @{user.username}
                  </span>
                </div>
              </div>

              <div className="hidden xl:flex text-slate-400">
                <MoreHorizontal size={18} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-[#0C1726] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1 z-40">
                <Link
                  href={`/${user.username}`}
                  onClick={() => setShowUserMenu(false)}
                  className="px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101D2D] rounded-xl flex items-center gap-2.5 transition"
                >
                  <User size={16} className="text-[#FF9933]" />
                  <span>View Profile</span>
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition text-left"
                >
                  <LogOut size={16} />
                  <span>Log out @{user.username}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden xl:flex flex-col gap-2 p-3 bg-slate-50 dark:bg-[#0B1422] rounded-2xl border border-slate-200 dark:border-[#1E293B]">
            <span className="text-xs text-slate-500 dark:text-slate-400">Join the conversation</span>
            <Link
              href="/login"
              className="text-center py-2 bg-[#FF9933] hover:bg-[#E68525] text-white rounded-xl text-sm font-semibold transition shadow-md shadow-[#FF9933]/20"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

