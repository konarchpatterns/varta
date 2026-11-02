import { create } from 'zustand';
import { apiRequest, setApiToken } from '../lib/api';
import { CurrentUser, LoginDto, RegisterDto } from '@varta/shared';

interface AuthState {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<any>;
  sendLoginOtp: (
    identifier: string,
  ) => Promise<{ success: boolean; maskedEmail: string; message: string }>;
  verifyLoginOtp: (identifier: string, otp: string) => Promise<void>;
  sendSignupOtp: (
    email: string,
    displayName?: string,
  ) => Promise<{ success: boolean; message: string; email: string }>;
  verifySignupOtp: (dto: {
    email: string;
    username: string;
    displayName: string;
    password: string;
    otp: string;
  }) => Promise<void>;
  googleAuth: (dto: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    googleId?: string;
    idToken?: string;
  }) => Promise<void>;
  sendPhoneOtp: (dto: {
    countryCode: string;
    phoneNumber: string;
    purpose: 'signup' | 'login';
  }) => Promise<{
    success: boolean;
    message: string;
    phone: string;
    countryCode: string;
    expiresInSeconds: number;
  }>;
  verifyPhoneSignup: (dto: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
    displayName: string;
    username: string;
    password: string;
  }) => Promise<void>;
  verifyPhoneLogin: (dto: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
  }) => Promise<void>;
  phonePasswordLogin: (dto: {
    countryCode: string;
    phoneNumber: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  updateUser: (updatedUser: Partial<CurrentUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,

  initAuth: async () => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem('varta_token');
    if (!storedToken) {
      set({ isInitialized: true });
      return;
    }

    setApiToken(storedToken);
    try {
      const user = await apiRequest<CurrentUser>('/auth/me');
      set({ user, token: storedToken, isInitialized: true });
    } catch {
      setApiToken(null);
      set({ user: null, token: null, isInitialized: true });
    }
  },

  login: async (dto: LoginDto) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      });

      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (dto: RegisterDto) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{
        requiresVerification?: boolean;
        message?: string;
        email?: string;
        user?: CurrentUser;
        accessToken?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(dto),
      });

      if (data.accessToken && data.user) {
        setApiToken(data.accessToken);
        set({ user: data.user, token: data.accessToken, isLoading: false });
      } else {
        set({ isLoading: false });
      }

      return data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  sendLoginOtp: async (identifier: string) => {
    return apiRequest<{
      success: boolean;
      maskedEmail: string;
      message: string;
    }>('/auth/login/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  verifyLoginOtp: async (identifier: string, otp: string) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>(
        '/auth/login/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({ identifier, otp }),
        },
      );
      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  sendSignupOtp: async (email: string, displayName?: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      email: string;
    }>('/auth/signup/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, displayName }),
    });
  },

  verifySignupOtp: async (dto: {
    email: string;
    username: string;
    displayName: string;
    password: string;
    otp: string;
  }) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>(
        '/auth/signup/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  googleAuth: async (dto: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    googleId?: string;
    idToken?: string;
  }) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>(
        '/auth/google',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  sendPhoneOtp: async (dto: {
    countryCode: string;
    phoneNumber: string;
    purpose: 'signup' | 'login';
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      phone: string;
      countryCode: string;
      expiresInSeconds: number;
    }>('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  verifyPhoneSignup: async (dto: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
    displayName: string;
    username: string;
    password: string;
  }) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>(
        '/auth/phone/verify-signup',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  verifyPhoneLogin: async (dto: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
  }) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>(
        '/auth/phone/verify-login',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  phonePasswordLogin: async (dto: {
    countryCode: string;
    phoneNumber: string;
    password: string;
  }) => {
    set({ isLoading: true });
    try {
      const data = await apiRequest<{ user: CurrentUser; accessToken: string }>(
        '/auth/phone/password-login',
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      setApiToken(data.accessToken);
      set({ user: data.user, token: data.accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setApiToken(null);
      set({ user: null, token: null });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  },

  updateUser: (updatedUser: Partial<CurrentUser>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updatedUser } });
    }
  },
}));
