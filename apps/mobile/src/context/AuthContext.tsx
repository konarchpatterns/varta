import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { User } from '../types';
import {
  AuthResult,
  fetchMeApi,
  getApiBaseUrl,
  googleAuthApi,
  hydrateSession,
  loginApi,
  logoutApi,
  registerApi,
  sendPhoneOtpApi,
  setAuthToken,
  verifyPhoneLoginApi,
  verifyPhoneSignupApi,
} from '../api/client';
import { disconnectSocket, getSocket, reconnectSocket } from '../api/socket';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** true until the stored session has been checked against the API */
  isInitializing: boolean;
  isLoading: boolean;
  activeDomain: string;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (dto: {
    displayName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; message: string; requiresVerification?: boolean }>;
  sendPhoneOtp: (dto: {
    countryCode: string;
    phoneNumber: string;
    purpose: 'login' | 'signup';
  }) => Promise<{ success: boolean; message: string; phone?: string; countryCode?: string }>;
  verifyPhoneLogin: (dto: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
  }) => Promise<boolean>;
  verifyPhoneSignup: (dto: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
    displayName: string;
    username: string;
    password: string;
  }) => Promise<boolean>;
  googleAuth: (dto: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    googleId?: string;
    idToken?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  /** merge local changes into the cached user (e.g. edited profile) */
  updateUser: (updated: Partial<User>) => void;
  /** re-fetch /auth/me and replace the cached user */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const socketBound = useRef(false);

  const applyAuth = useCallback((auth: AuthResult) => {
    setUser(auth.user);
    // Socket gateway authenticates from handshake.auth.token
    reconnectSocket();
  }, []);

  // ---- Session bootstrap: restore token from storage, validate with /auth/me
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrateSession();
      try {
        const me = await fetchMeApi();
        if (!cancelled) setUser(me);
      } catch {
        // invalid/expired token — stay signed out
        setAuthToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Keep notifications / message badges live
  useEffect(() => {
    if (!user || socketBound.current) return;
    socketBound.current = true;
    const socket = getSocket();
    socket.on('connect', () => {
      // re-join the personal room after a reconnect
    });
    return () => {
      // keep listeners attached for the app lifetime
    };
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMeApi();
      setUser(me);
    } catch {
      // keep the cached user; screens will surface their own errors
    }
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setIsLoading(true);
      try {
        const auth = await loginApi(identifier.trim(), password);
        applyAuth(auth);
        return true;
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuth],
  );

  const register = useCallback(
    async (dto: { displayName: string; username: string; email: string; password: string }) => {
      setIsLoading(true);
      try {
        const res = await registerApi(dto);
        if (res.auth) {
          applyAuth(res.auth);
        }
        return {
          success: true,
          message: res.message,
          requiresVerification: res.requiresVerification,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuth],
  );

  const sendPhoneOtp = useCallback(
    async (dto: { countryCode: string; phoneNumber: string; purpose: 'login' | 'signup' }) =>
      sendPhoneOtpApi(dto),
    [],
  );

  const verifyPhoneLogin = useCallback(
    async (dto: { countryCode: string; phoneNumber: string; otp: string }) => {
      setIsLoading(true);
      try {
        const auth = await verifyPhoneLoginApi(dto);
        applyAuth(auth);
        return true;
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuth],
  );

  const verifyPhoneSignup = useCallback(
    async (dto: {
      countryCode: string;
      phoneNumber: string;
      otp: string;
      displayName: string;
      username: string;
      password: string;
    }) => {
      setIsLoading(true);
      try {
        const auth = await verifyPhoneSignupApi(dto);
        applyAuth(auth);
        return true;
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuth],
  );

  const googleAuth = useCallback(
    async (dto: {
      email: string;
      displayName: string;
      avatarUrl?: string;
      googleId?: string;
      idToken?: string;
    }) => {
      setIsLoading(true);
      try {
        const auth = await googleAuthApi(dto);
        applyAuth(auth);
        return true;
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    await logoutApi();
    disconnectSocket();
    socketBound.current = false;
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitializing,
        isLoading,
        activeDomain: getApiBaseUrl().replace(/\/api\/v1$/, ''),
        login,
        register,
        sendPhoneOtp,
        verifyPhoneLogin,
        verifyPhoneSignup,
        googleAuth,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
