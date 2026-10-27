import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { authApi, LoginPayload } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isStudent: boolean;
  isFaculty: boolean;
  isHod: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dms_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dms_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = localStorage.getItem('dms_token');
      // If we have a token or an active cookie session, verify with /auth/me
      try {
        const currentUser = await authApi.me();
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem('dms_user', JSON.stringify(currentUser));
        }
      } catch {
        if (isMounted && !storedToken) {
          setUser(null);
          localStorage.removeItem('dms_user');
          localStorage.removeItem('dms_token');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('dms:session-expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('dms:session-expired', handleSessionExpired);
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const result = await authApi.login(payload);
      setUser(result.user);
      setToken(result.token);
      localStorage.setItem('dms_token', result.token);
      localStorage.setItem('dms_user', JSON.stringify(result.user));
      return result.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const updated = await authApi.me();
      setUser(updated);
      localStorage.setItem('dms_user', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const isStudent = user?.role === 'STUDENT';
  const isFaculty = user?.role === 'FACULTY';
  const isHod = user?.role === 'HOD';
  const isAdmin = user?.role === 'DEPARTMENT_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
        isStudent,
        isFaculty,
        isHod,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
