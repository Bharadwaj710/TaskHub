import { supabase } from "@/lib/supabase";
import { ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";

export interface GeneratedImage {
  id: number;
  task_id: number;
  image_type: string;
  image_url: string;
  prompt_used: string;
  created_at: string;
}

export interface JobStatus {
  id: number;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  return response.json();
}

export const aiService = {
  async generateImage(taskId: number, prompt: string, imageType: string): Promise<ApiResponse<{ job_id: number }>> {
    return fetchWithAuth(`/tasks/${taskId}/generate`, {
      method: "POST",
      body: JSON.stringify({ prompt, image_type: imageType }),
    });
  },

  async getJobStatus(jobId: number): Promise<ApiResponse<JobStatus>> {
    return fetchWithAuth(`/jobs/${jobId}/status`);
  },

  async getTaskGenerations(taskId: number): Promise<ApiResponse<GeneratedImage[]>> {
    return fetchWithAuth(`/tasks/${taskId}/generations`);
  },

  async deleteGeneration(generationId: number): Promise<ApiResponse> {
    return fetchWithAuth(`/generations/${generationId}`, {
      method: "DELETE",
    });
  }
};
