import { supabase } from "@/lib/supabase";
import { ActivityLog, Task, ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  return response.json();
}

export const taskService = {
  async getTasks(): Promise<ApiResponse<Task[]>> {
    return fetchWithAuth("/tasks");
  },

  async getMyTasks(): Promise<ApiResponse<Task[]>> {
    return fetchWithAuth("/my-tasks");
  },

  async getTask(id: number): Promise<ApiResponse<Task>> {
    return fetchWithAuth(`/tasks/${id}`);
  },

  async createTask(taskData: Partial<Task>): Promise<ApiResponse> {
    return fetchWithAuth("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  },

  async uploadProductImage(file: File): Promise<ApiResponse<{ url: string }>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, message: "No active session", data: { url: "" } };
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/tasks/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        // Note: Content-Type is purposely omitted so browser sets multipart boundary
      },
      body: formData,
    });

    return response.json();
  },

  async updateStatus(id: number, status: Task['status']): Promise<ApiResponse> {
    return fetchWithAuth("/tasks/status", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
  },

  async assignTask(id: number, assignedTo: string): Promise<ApiResponse<Task>> {
    return fetchWithAuth(`/tasks/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
  },

  async startTask(id: number): Promise<ApiResponse> {
    return fetchWithAuth(`/tasks/${id}/start`, {
      method: "PUT",
    });
  },

  async submitTask(id: number): Promise<ApiResponse> {
    return fetchWithAuth(`/tasks/${id}/submit`, {
      method: "POST",
    });
  },

  async acceptTask(id: number): Promise<ApiResponse> {
    return fetchWithAuth(`/tasks/${id}/accept`, {
      method: "PUT",
    });
  },

  async requestRevision(id: number): Promise<ApiResponse> {
    return fetchWithAuth(`/tasks/${id}/request-revision`, {
      method: "PUT",
    });
  },

  async deleteTask(id: number): Promise<ApiResponse> {
    return fetchWithAuth(`/tasks/${id}`, {
      method: "DELETE",
    });
  },

  async updateTask(id: number, taskData: Partial<Task>): Promise<ApiResponse> {
    return fetchWithAuth(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
  },

  async getActivities(): Promise<ApiResponse<ActivityLog[]>> {
    return fetchWithAuth("/tasks/activities");
  },

  async getAnalytics(): Promise<ApiResponse<import("@/types").AnalyticsData>> {
    return fetchWithAuth("/tasks/analytics");
  },
};
