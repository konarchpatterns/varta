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
  User,
  Users,
  Bookmark,
  FileText,
  Sparkles,
  Settings,
  ShieldCheck,
  LogOut,
  Crown,
  Menu,
  X,
  PenTool,
  CheckCircle,
} from 'lucide-react';
import { VartaLogo } from '../common/VartaLogo';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';

interface MobileNavProps {
  onOpenCompose?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenCompose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch unread messages count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unread-messages-count'],
    queryFn: () => apiRequest('/messages/unread-count'),
    enabled: !!user,
    refetchInterval: 6000,
  });

  const unreadCount = unreadData?.count || 0;

  // Fetch unread notifications count
  const { data: unreadNotificationsData } = useQuery<{
    count: number;
    unreadCount: number;
  }>({
    queryKey: ['unread-notifications-count'],
    queryFn: () => apiRequest('/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const unreadNotificationsCount =
    unreadNotificationsData?.count ??
    unreadNotificationsData?.unreadCount ??
    0;

  // Real-time WebSocket listener for unread count & notifications
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleUnreadCount = (data: { count: number }) => {
      queryClient.setQueryData(['unread-messages-count'], {
        count: data.count,
      });
    };

    const handleNewNotification = () => {
      queryClient.invalidateQueries({
        queryKey: ['unread-notifications-count'],
      });
    };

    socket.on('messages:unread_count', handleUnreadCount);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('messages:unread_count', handleUnreadCount);
      socket.off('notification:new', handleNewNotification);
    };
  }, [user, queryClient]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  // Auto-close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const navDrawerItems = [
    { label: 'Home', href: '/home', icon: Home },
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
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
    { label: 'Communities', href: '/communities', icon: Users },
    { label: 'Premium', href: '/settings', icon: Sparkles },
    { label: 'Lists', href: '/bookmarks', icon: FileText },
    {
      label: 'Profile',
      href: user ? `/${user.username}` : '/login',
      icon: User,
    },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
    navDrawerItems.push({
      label: 'Admin Panel',
      href: '/admin',
      icon: ShieldCheck,
    });
  }

  return (
    <>
      {/* 1. Top Mobile Header Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#050B14]/95 backdrop-blur-md border-b border-[#1E293B] px-3.5 py-2.5 flex items-center justify-between">
        {/* Left: Hamburger Button & Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar menu"
            className="p-1.5 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-[#101D2D] transition flex items-center justify-center active:scale-95"
          >
            <Menu size={22} className="stroke-[2.2]" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open profile sidebar"
            className="h-8 w-8 rounded-full bg-[#101D2D] flex items-center justify-center text-[#FF9933] font-bold overflow-hidden ring-1 ring-[#1E293B] active:scale-95 transition shrink-0"
          >
            {user?.profile?.avatarUrl ? (
              <img
                src={user.profile.avatarUrl}
                alt={user.username}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              (user?.username || 'V').charAt(0).toUpperCase()
            )}
          </button>
        </div>

        {/* Center: VARTA Logo with Text & Tagline */}
        <Link
          href={user ? '/home' : '/'}
          className="flex items-center justify-center hover:opacity-95 transition"
        >
          <VartaLogo size={28} showText={true} showTagline={true} />
        </Link>

        {/* Right: Search / Explore */}
        <Link
          href="/search"
          aria-label="Search"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#101D2D] transition"
        >
          <Search size={20} />
        </Link>
      </header>

      {/* 2. Slide-out Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Menu Content */}
          <div className="relative w-[290px] sm:w-[320px] max-w-[85vw] h-full bg-[#070D18] border-r border-[#1E293B] flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-200 select-none">
            {/* Top User Header & Links */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  Account Menu
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#101D2D] transition"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Identity Section */}
              {user ? (
                <div className="py-4 border-b border-[#1E293B]">
                  <Link
                    href={`/${user.username}`}
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 group"
                  >
                    <div className="h-12 w-12 rounded-full bg-[#101D2D] flex items-center justify-center text-[#FF9933] font-bold text-lg overflow-hidden ring-2 ring-[#1E293B] group-hover:ring-[#FF9933]/50 transition shrink-0">
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
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white text-sm truncate flex items-center gap-1 group-hover:underline">
                        {user.profile?.displayName || user.username}
                        {user.isVerified && (
                          <CheckCircle
                            size={14}
                            className="text-[#FF9933] fill-[#FF9933]/20 shrink-0"
                          />
                        )}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        @{user.username}
                      </span>
                    </div>
                  </Link>

                  {/* Followers & Following Counts */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-1">
                    <Link
                      href={`/${user.username}/following`}
                      onClick={() => setIsSidebarOpen(false)}
                      className="hover:underline flex items-center gap-1"
                    >
                      <strong className="text-white font-bold">
                        {user.followingCount ?? 0}
                      </strong>
                      <span>Following</span>
                    </Link>
                    <Link
                      href={`/${user.username}/followers`}
                      onClick={() => setIsSidebarOpen(false)}
                      className="hover:underline flex items-center gap-1"
                    >
                      <strong className="text-white font-bold">
                        {user.followersCount ?? 0}
                      </strong>
                      <span>Followers</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-4 border-b border-[#1E293B] flex flex-col gap-2.5">
                  <span className="text-xs text-slate-400">
                    Join VARTA — Baat Sabki
                  </span>
                  <Link
                    href="/login"
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-full text-center py-2 bg-[#FF9933] hover:bg-[#E68525] text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    Log In / Sign Up
                  </Link>
                </div>
              )}

              {/* Navigation Menu Links */}
              <nav className="flex flex-col gap-1 py-3">
                {navDrawerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/home' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition text-sm ${
                        isActive
                          ? 'bg-[#FF9933] text-white font-bold shadow-md shadow-[#FF9933]/20'
                          : 'text-slate-300 hover:text-white hover:bg-[#101D2D]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon
                          size={19}
                          className={isActive ? 'text-white' : 'text-slate-400'}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && !isActive && (
                        <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#FF9933] text-white text-[10px] font-extrabold shadow">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions: Upgrade + Logout */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#1E293B]">
              {/* Upgrade to VARTA+ Banner */}
              <Link
                href="/settings?tab=premium"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-[#FF9933]/15 dark:to-[#FF9933]/5 border border-amber-200 dark:border-[#FF9933]/25 hover:border-[#FF9933]/50 transition group"
              >
                <div className="p-1.5 rounded-lg bg-[#FF9933]/20 text-[#FF9933]">
                  <Crown size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#FF9933] transition">
                    Upgrade to VARTA+
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">
                    Get verified & unlock premium tools
                  </span>
                </div>
              </Link>

              {user && (
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition text-left"
                >
                  <LogOut size={16} />
                  <span>Log out @{user.username}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Action Button (FAB) for Create Post in Mobile View */}
      {user && (
        <button
          onClick={onOpenCompose}
          aria-label="Create Post"
          className="lg:hidden fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full bg-[#FF9933] hover:bg-[#E68525] active:scale-90 text-white shadow-2xl shadow-[#FF9933]/50 flex items-center justify-center transition-all duration-200 hover:scale-105 border border-white/20 cursor-pointer"
        >
          <PenTool size={22} className="stroke-[2.5]" />
        </button>
      )}

      {/* 4. Bottom Mobile Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050B14]/95 backdrop-blur-lg border-t border-[#1E293B] flex items-center justify-around py-2.5 px-3">
        {/* Home */}
        <Link
          href={user ? '/home' : '/'}
          className={`p-2 transition ${
            pathname === '/home' || (pathname === '/' && !user) ? 'text-[#FF9933]' : 'text-slate-400'
          }`}
        >
          <Home
            size={22}
            className={pathname === '/home' ? 'stroke-[2.5]' : ''}
          />
        </Link>

        {/* Explore */}
        <Link
          href="/explore"
          className={`p-2 transition ${
            pathname === '/explore' ? 'text-[#FF9933]' : 'text-slate-400'
          }`}
        >
          <Search
            size={22}
            className={pathname === '/explore' ? 'stroke-[2.5]' : ''}
          />
        </Link>

        {/* Communities */}
        <Link
          href="/communities"
          className={`p-2 transition ${
            pathname === '/communities' ? 'text-[#FF9933]' : 'text-slate-400'
          }`}
        >
          <Users
            size={22}
            className={pathname === '/communities' ? 'stroke-[2.5]' : ''}
          />
        </Link>

        {/* Notifications */}
        <Link
          href="/notifications"
          className={`p-2 transition relative ${
            pathname === '/notifications' ? 'text-[#FF9933]' : 'text-slate-400'
          }`}
        >
          <Bell
            size={22}
            className={pathname === '/notifications' ? 'stroke-[2.5]' : ''}
          />
          {unreadNotificationsCount > 0 && pathname !== '/notifications' && (
            <span className="absolute -top-0.5 right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#FF9933] text-white text-[10px] font-bold shadow animate-in zoom-in-75">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </Link>

        {/* Messages with Unread Badge */}
        <Link
          href="/messages"
          className={`p-2 transition relative ${
            pathname === '/messages' ? 'text-[#FF9933]' : 'text-slate-400'
          }`}
        >
          <Mail
            size={22}
            className={pathname === '/messages' ? 'stroke-[2.5]' : ''}
          />
          {unreadCount > 0 && pathname !== '/messages' && (
            <span className="absolute -top-0.5 right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#FF9933] text-white text-[10px] font-bold shadow animate-in zoom-in-75">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </nav>
    </>
  );
};
