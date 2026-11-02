'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Shield,
  Users,
  MessageSquare,
  Globe,
  TrendingUp,
  PlaySquare,
  Loader2,
} from 'lucide-react';
import { VartaLogo } from '../components/common/VartaLogo';
import { useAuthStore } from '../stores/authStore';

export default function SplashPage() {
  const router = useRouter();
  const { user, isInitialized, login } = useAuthStore();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [hasStoredToken, setHasStoredToken] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !!localStorage.getItem('varta_token')) {
      setHasStoredToken(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/home');
    }
  }, [user, isInitialized, router]);

  const handleDemoSignIn = async () => {
    setIsDemoLoading(true);
    try {
      await login({ identifier: 'aarav_sharma', password: 'Varta@2026Secure!' });
      router.replace('/home');
    } catch {
      router.push('/login');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const valueProps = [
    {
      icon: MessageSquare,
      title: 'Real Conversations',
      desc: 'Join open discussions with real people across India and beyond.',
    },
    {
      icon: Globe,
      title: 'Multiple Languages',
      desc: 'Speak freely in Hindi, English, Tamil, Telugu, Bengali and more.',
    },
    {
      icon: Users,
      title: 'Communities',
      desc: 'Join interest-based communities, discuss, share and grow together.',
    },
    {
      icon: TrendingUp,
      title: 'Trending Topics',
      desc: 'Stay updated on what India is talking about, from local news to global trends.',
    },
    {
      icon: PlaySquare,
      title: 'Creators & Content',
      desc: 'Share your thoughts, photos, videos and original ideas.',
    },
    {
      icon: Shield,
      title: 'Safe & Positive Space',
      desc: 'A respectful and inclusive platform for meaningful conversations.',
    },
  ];

  if ((isInitialized && user) || (hasStoredToken && !isInitialized)) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between text-slate-900 selection:bg-[#FF8A00]/20 selection:text-[#EA580C] relative">
      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-6 flex items-center justify-between relative z-20">
        <Link href="/" className="flex items-center">
          <VartaLogo size={32} showText={true} showTagline={true} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-5">
          <Link
            href="/login"
            className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-black transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            style={{ color: '#FFFFFF' }}
            className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 bg-[#FF8A00] hover:bg-[#E67A00] text-white text-force-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Hero Section with Responsive Panoramic Indian Heritage & Youth Artwork */}
      <section className="relative w-full overflow-hidden pt-1 sm:pt-4 pb-8 sm:pb-14">
        {/* Mobile Top Hero Artwork Banner (Matching Mobile Mockup) */}
        <div className="block lg:hidden w-full max-w-[460px] mx-auto px-3 mb-1 pointer-events-none select-none">
          <img
            src="/assets/landing-hero-mobile.png"
            alt="Indian Youth, India Gate & Parliament"
            className="w-full h-auto object-contain drop-shadow-xs"
          />
        </div>

        {/* Desktop/Widescreen Constrained Container ensuring artwork sits intimately close to the center content */}
        <div className="relative w-full max-w-[1180px] mx-auto min-h-[380px] lg:min-h-[460px] flex items-center justify-center px-4 sm:px-6">
          {/* Desktop Left Artwork Banner: India Gate, Tricolor, Youth & Speech Bubbles */}
          <div className="hidden lg:block absolute left-0 xl:left-2 top-0 bottom-0 w-[320px] xl:w-[350px] pointer-events-none select-none z-0">
            <img
              src="/assets/landing-hero-left.png"
              alt="Indian Youth & India Gate"
              className="w-full h-full object-contain object-left-top"
            />
          </div>

          {/* Desktop Right Artwork Banner: Parliament, Qutub Minar, Tricolor, Youth & Speech Bubbles */}
          <div className="hidden lg:block absolute right-0 xl:right-2 top-0 bottom-0 w-[320px] xl:w-[350px] pointer-events-none select-none z-0">
            <img
              src="/assets/landing-hero-right.png"
              alt="Indian Youth & Parliament"
              className="w-full h-full object-contain object-right-top"
            />
          </div>

          {/* Center Hero Interactive Content */}
          <div className="relative z-10 w-full max-w-[530px] mx-auto px-2 sm:px-4 flex flex-col items-center text-center">
            {/* Center Official 3D VARTA Emblem & Wordmark */}
            <div className="relative mb-3.5 sm:mb-4 flex flex-col items-center">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF9933]/15 rounded-full blur-2xl pointer-events-none" />
              <img
                src="/varta-logo-mark.png"
                alt="VARTA Emblem"
                className="h-16 sm:h-22 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300 relative z-10"
              />
              <div className="flex flex-col items-center mt-1.5 sm:mt-2 select-none relative z-10">
                <span className="text-2xl sm:text-[32px] font-black tracking-[0.16em] text-[#0B1422] leading-none">
                  VARTA
                </span>
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                  <span className="w-5 sm:w-6 h-[2px] sm:h-[2.5px] bg-[#FF8A00] rounded-full inline-block" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 tracking-wider">
                    Baat Sabki
                  </span>
                  <span className="w-5 sm:w-6 h-[2px] sm:h-[2.5px] bg-[#00C853] rounded-full inline-block" />
                </div>
              </div>
            </div>

            {/* Space For Conversations Pill Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#FFF3E8] border border-[#FFD0B0] text-[#EA580C] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider mb-3 sm:mb-4 shadow-2xs">
              <Users size={12} className="text-[#EA580C] shrink-0" />
              <span>India&apos;s Space for Conversations & Ideas</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0B1422] leading-[1.12]">
              Real People.
              <br />
              <span className="text-[#FF7A00]">Real Conversations.</span>
            </h1>

            {/* Subtitle Description */}
            <p className="mt-2.5 sm:mt-4 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed px-1">
              <strong className="text-slate-900 font-bold">VARTA</strong> — India&apos;s
              premier social networking platform designed for authentic discourse,
              multilingual discussions, and local community trends.
            </p>

            {/* CTA Buttons */}
            <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3.5 w-full justify-center max-w-[340px] sm:max-w-none">
              <Link
                href="/register"
                style={{ color: '#FFFFFF' }}
                className="w-full sm:w-auto px-6 sm:px-7 py-2.5 sm:py-3 bg-[#FF7A00] hover:bg-[#E66D00] text-white text-force-white text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Create Account</span>
                <ArrowRight
                  size={16}
                  className="text-white text-force-white group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={isDemoLoading}
                className="w-full sm:w-auto px-6 sm:px-7 py-2.5 sm:py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 hover:text-black text-xs sm:text-base font-semibold rounded-xl sm:rounded-2xl transition duration-200 shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isDemoLoading ? (
                  <Loader2 size={16} className="animate-spin text-[#FF7A00]" />
                ) : null}
                <span>Sign In with Demo Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Value Propositions Highlights Grid (2 cols on mobile, 3 cols on lg+) */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pb-12 sm:pb-14">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4.5 w-full text-left">
          {valueProps.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-3 sm:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#FFB74D] hover:shadow-sm transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 group"
              >
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 text-[#FF8A00] group-hover:scale-110 transition-transform">
                  <Icon size={16} className="sm:hidden" strokeWidth={2} />
                  <Icon size={19} className="hidden sm:block" strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-[#0B1422] text-xs sm:text-sm leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 leading-snug sm:leading-relaxed mt-0.5 sm:mt-1">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Minimal Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-10 py-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-400 font-medium">
        <div>
          <span>© 2026 VARTA — Baat Sabki. Made for India.</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/terms" className="hover:text-slate-700 transition">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-700 transition">
            Privacy Policy
          </Link>
          <Link href="/grievance" className="hover:text-slate-700 transition">
            Grievance Officer
          </Link>
        </div>
      </footer>
    </div>
  );
}
