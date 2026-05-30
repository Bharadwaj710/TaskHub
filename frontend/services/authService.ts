import { supabase } from "@/lib/supabase";
import { ApiResponse, UserProfile } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const authService = {
  async syncUser(): Promise<ApiResponse<Pick<UserProfile, "id" | "role">>> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!session || !user) {
      return { success: false, message: "No active session found", data: { id: "", role: "user" } };
    }

    const response = await fetch(`${API_BASE_URL}/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: user.email,
        name: user.user_metadata.full_name || user.user_metadata.name,
        avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
      }),
    });

    return response.json();
  },

  async getMe(): Promise<ApiResponse<UserProfile>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: "No active session", data: {} as UserProfile };
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    return response.json();
  },
};