export type UserRole = 'admin' | 'user';

export type TaskStatus =
  | 'Pending'
  | 'Assigned'
  | 'In Progress'
  | 'Submitted'
  | 'Accepted'
  | 'Revision Requested';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  created_by: string;
  created_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  product_image_url?: string;
  submitted_at?: string;
  accepted_at?: string;
  revision_note?: string;
  assigned_at?: string;
  created_at: string;
  completed_at?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface AnalyticsData {
  total_users: number;
  total_tasks: number;
  generated_images: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  submitted_tasks: number;
  accepted_tasks: number;
}