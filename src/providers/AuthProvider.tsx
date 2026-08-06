import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import type { Session, User } from '@supabase/supabase-js';

interface AuthPermissions {
  canManageContent: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canRevealCredentials: boolean;
  canDownloadPrivate: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDelete: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string;
  permissions: AuthPermissions;
  authLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const defaultPermissions: AuthPermissions = {
  canManageContent: false,
  canManageSettings: false,
  canManageUsers: false,
  canRevealCredentials: false,
  canDownloadPrivate: false,
  canPublish: false,
  canArchive: false,
  canDelete: false,
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: 'viewer',
  permissions: defaultPermissions,
  authLoading: true,
  error: null,
  isAuthenticated: false,
  signIn: async () => ({ data: null, error: null }),
  signOut: async () => {},
  refreshSession: async () => {},
});

function resolveRole(user: User | null): string {
  if (!user) return 'viewer';
  const role = (user.user_metadata?.role as string) || (user.app_metadata?.role as string) || 'viewer';
  return role;
}

function resolvePermissions(role: string): AuthPermissions {
  const isAdmin = role === 'super_admin' || role === 'admin';
  const isEditor = isAdmin || role === 'developer';
  return {
    canManageContent: isEditor,
    canManageSettings: isAdmin,
    canManageUsers: isAdmin,
    canRevealCredentials: isAdmin,
    canDownloadPrivate: isEditor,
    canPublish: isEditor,
    canArchive: isAdmin,
    canDelete: isAdmin,
  };
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('viewer');
  const [permissions, setPermissions] = useState<AuthPermissions>(defaultPermissions);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      setError('Supabase is not configured.');
      return;
    }

    let mounted = true;
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } =
          await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('Session restoration error:', sessionError);
          setError(sessionError.message);
        } else {
          setSession(currentSession ?? null);
          setUser(currentSession?.user ?? null);
          setRole(resolveRole(currentSession?.user ?? null));
          setPermissions(resolvePermissions(resolveRole(currentSession?.user ?? null)));
          setError(null);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    const setupSubscription = () => {
      authSubscription = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (!mounted) return;

          setSession(newSession ?? null);
          setUser(newSession?.user ?? null);
          setRole(resolveRole(newSession?.user ?? null));
          setPermissions(resolvePermissions(resolveRole(newSession?.user ?? null)));
        }
      );
    };

    initializeAuth();
    setupSubscription();

    return () => {
      mounted = false;
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    return { data, error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
  };

  const refreshSession = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase.auth.refreshSession();
    if (error) setError(error.message);
    return data;
  };

  const value: AuthContextType = {
    session,
    user,
    role,
    permissions,
    authLoading,
    error,
    isAuthenticated: !!session,
    signIn,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}