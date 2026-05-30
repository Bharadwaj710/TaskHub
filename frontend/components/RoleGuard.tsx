"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Wraps a page or section and redirects users whose role
 * is not in allowedRoles. Shows a loading state while auth
 * is being hydrated from localStorage to prevent a flash.
 */
export function RoleGuard({
  allowedRoles,
  redirectTo = "/dashboard",
  children,
}: RoleGuardProps) {
  const { userRole, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userRole || !allowedRoles.includes(userRole)) {
      router.replace(redirectTo);
    }
  }, [isLoaded, userRole, allowedRoles, redirectTo, router]);

  // While hydrating, show a neutral spinner
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  // If role doesn't match, render nothing while redirect fires
  if (!userRole || !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}
