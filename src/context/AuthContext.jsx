/* ============================================================================
   src/context/AuthContext.jsx — AUTH STATE (Supabase)
   ----------------------------------------------------------------------------
   Wraps supabase.auth session handling + the matching `profiles` row (the
   app-specific data — name/specialty/avatar — not just the raw auth user).
   ============================================================================ */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { getProfile } from "../lib/db.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    try {
      setProfile(await getProfile(userId));
    } catch {
      // handle_new_user() may not have committed yet right after signup —
      // retry once before giving up.
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        setProfile(await getProfile(userId));
      } catch {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function signInWithPassword(email, password) {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function signUpWithPassword(email, password, fullName) {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    // If email confirmation is required on this Supabase project, signUp()
    // succeeds but returns no session — the caller should show a
    // "check your email" message instead of expecting to be logged in.
    return { needsEmailConfirmation: !data.session };
  }

  async function signInWithGoogle() {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  const value = {
    user,
    profile,
    loading,
    authError,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used within an AuthProvider");
  return ctx;
}
