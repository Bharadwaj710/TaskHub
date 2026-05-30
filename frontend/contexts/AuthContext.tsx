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
    }
    setIsLoaded(true);
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
