"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      // Supabase client automatically processes the hash fragment and saves the session.
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.error("Auth error:", error);
        router.push("/login");
        return;
      }

      // Sync user with our Flask backend with retry logic to handle cold starts.
      let attempts = 3;
      let success = false;
      let lastErrorMessage = "";

      while (attempts > 0 && !success) {
        try {
          const syncRes = await authService.syncUser();
          if (syncRes.success && syncRes.data) {
            // Persist role + userId to AuthContext (which also persists to localStorage)
            setAuth(syncRes.data.id, syncRes.data.role);
            success = true;
            // All roles go to /dashboard for now; role-based redirect added in Phase 5
            router.push("/dashboard");
            return;
          } else {
            lastErrorMessage = syncRes.message || "Failed to sync";
            console.warn(`Sync attempt failed (${4 - attempts}/3): ${lastErrorMessage}`);
          }
        } catch (err: unknown) {
          const errorObj = err as Error;
          lastErrorMessage = errorObj?.message || "Network error during sync";
          console.warn(`Sync attempt errored (${4 - attempts}/3): ${lastErrorMessage}`);
        }

        attempts--;
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      if (!success) {
        console.error("Failed to sync user after all attempts:", lastErrorMessage);
        router.push("/login");
      }
    };

    handleAuth();
  }, [router, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium">Authenticating...</p>
      </div>
    </div>
  );
}
