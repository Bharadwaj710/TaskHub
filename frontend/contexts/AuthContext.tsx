"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole } from "@/types";

interface AuthContextValue {
  userId: string | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  isLoaded: boolean;
  setAuth: (id: string, role: UserRole) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  userRole: null,
  isAdmin: false,
  isLoaded: false,
  setAuth: () => {},
  clearAuth: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage on mount (avoids flash of wrong UI)
    const storedId = localStorage.getItem("userId");
    const storedRole = localStorage.getItem("userRole") as UserRole | null;
    if (storedId && storedRole) {
      setUserId(storedId);
      setUserRole(storedRole);
      setIsLoaded(true);
    } else {
      // No localStorage — user was logged in before Phase 1.
      // Re-fetch role from the API using the current Supabase session.
      const refetchRole = async () => {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { setIsLoaded(true); return; }

          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const json = await res.json();
          if (json.success && json.data) {
            const role: UserRole = json.data.role ?? "user";
            const id: string = json.data.id;
            setUserId(id);
            setUserRole(role);
            localStorage.setItem("userId", id);
            localStorage.setItem("userRole", role);
          }
        } catch (e) {
          console.error("Role refetch failed:", e);
        } finally {
          setIsLoaded(true);
        }
      };
      refetchRole();
    }
  }, []);

  const setAuth = (id: string, role: UserRole) => {
    setUserId(id);
    setUserRole(role);
    localStorage.setItem("userId", id);
    localStorage.setItem("userRole", role);
  };

  const clearAuth = () => {
    setUserId(null);
    setUserRole(null);
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        userRole,
        isAdmin: userRole === "admin",
        isLoaded,
        setAuth,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
