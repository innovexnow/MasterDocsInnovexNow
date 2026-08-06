import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Authentication hook that properly handles Supabase session restoration
 * and persistent login state across page refreshes.
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setError('Supabase not configured');
      return;
    }

    let mounted = true;
    let authSubscription = null;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // First, try to restore any existing session
        const { data: { session: currentSession }, error: sessionError } = 
          await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error('Session restoration error:', sessionError);
          setError(sessionError.message);
        } else {
          setSession(currentSession);
          setError(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Subscribe to auth state changes
    const setupAuthSubscription = () => {
      authSubscription = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', event, newSession?.user?.email);
          
          switch (event) {
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
            case 'USER_UPDATED':
              setSession(newSession);
              setError(null);
              break;
            
            case 'SIGNED_OUT':
              setSession(null);
              setError(null);
              break;
            
            case 'INITIAL_SESSION':
              // Already handled by getSession()
              break;
          }
        }
      );
    };

    // Initialize auth
    initializeAuth();
    setupAuthSubscription();

    // Cleanup
    return () => {
      mounted = false;
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      setSession(data.session);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data: { session: newSession }, error } = 
        await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      setSession(newSession);
      return newSession;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    session,
    user: session?.user,
    isLoading,
    error,
    isAuthenticated: !!session,
    signIn,
    signOut,
    refreshSession,
  };
}