"use client";

import { Task, TaskStatus } from "@/types";
import { Calendar, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { taskService } from "@/services/taskService";
import { EditTaskModal } from "@/components/dashboard/edit-task-modal";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const statusColors: Record<TaskStatus, string> = {
  Pending: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/35",
  "In Progress": "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/35",
  Completed: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/35",
};

interface TaskCardProps {
  task: Task;
  currentUserId: string | null;
  onStatusChanged: () => void;
}

export function TaskCard({ task, currentUserId, onStatusChanged }: TaskCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [localStatus, setLocalStatus] = useState<TaskStatus>(task.status);

  // Sync state with task prop when it changes
  useEffect(() => {
    setLocalStatus(task.status);
  }, [task.status]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === localStatus) return;
    
    const previousStatus = localStatus;
    // Set optimistically
    setLocalStatus(newStatus);
    
    try {
      const res = await taskService.updateStatus(task.id, newStatus);
      if (res.success) {
        if (newStatus === "Completed") {
          toast.success("Task completed!", {
            description: "Email notification has been dispatched to the creator.",
          });
        } else {
          toast.success(`Task status updated to "${newStatus}"`);
        }
        onStatusChanged();
      } else {
        // Revert
        setLocalStatus(previousStatus);
        toast.error(res.message || "Failed to update task status");
      }
    } catch (error) {
      // Revert
      setLocalStatus(previousStatus);
      console.error("Failed to update status:", error);
      toast.error("Failed to update task status due to network error.");
    }
  };

  const handleDeleteTask = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const res = await taskService.deleteTask(task.id);
      if (res.success) {
        toast.success("Task deleted successfully!");
        onStatusChanged();
      } else {
        toast.error(res.message || "Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task due to network error.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[200px]"
    >
      {/* Invisible overlay that makes the entire card clickable and opens the modal */}
      {(task.created_by === currentUserId || task.assigned_to === currentUserId) && (
        <EditTaskModal 
          task={task} 
          currentUserId={currentUserId} 
          onTaskUpdated={onStatusChanged} 
          trigger={
            <button type="button" className="absolute inset-0 z-0 cursor-pointer rounded-2xl w-full h-full opacity-0 outline-none" title={task.created_by === currentUserId ? "Click to edit task" : "Click to view full task details"} />
          }
        />
      )}

      <div className="relative z-10 space-y-3 pointer-events-none">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pointer-events-auto">
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 tracking-tight line-clamp-1 flex-1 leading-snug">
            {task.title}
          </h4>
          
          <div className="flex items-center gap-1 shrink-0">
            {/* Delete button (only for creator) */}
            {task.created_by === currentUserId && (
              <button 
                onClick={handleDeleteTask}
                disabled={deleting}
                className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer disabled:opacity-50"
                title="Delete Task"
              >
                {deleting ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4.5 w-4.5" />
                )}
              </button>
            )}

          </div>
        </div>

        {/* Static Status Badge */}
        <div>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${statusColors[localStatus]}`}>
            {localStatus}
          </div>
        </div>

        {/* Description */}
        <p className="text-[14px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">
          {task.description || "No description provided."}
        </p>
        
        {/* Click to view details prompt */}
        <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium italic mt-1 opacity-80">
          {task.created_by === currentUserId 
            ? "Click task to edit details, description or assignment"
            : `Click task to view complete details ${task.product_image_url ? "& product images" : ""}`
          }
        </div>
      </div>

      {/* Footer Meta Row */}
      <div className="relative z-10 pointer-events-auto flex items-center justify-between pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex-wrap gap-y-3">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 shrink-0">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Creator and Assignee Stack */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Creator Badge */}
          <div className="flex items-center gap-1.5 border-r border-slate-100 dark:border-slate-850 pr-3 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">By:</span>
            {task.created_by === currentUserId ? (
              <>
                <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-350 flex items-center justify-center uppercase shadow-inner">
                  Y
                </div>
                <span className="text-[11px] font-medium text-slate-550 dark:text-slate-400">
                  You
                </span>
              </>
            ) : (
              <>
                <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-350 flex items-center justify-center uppercase shadow-inner">
                  {task.created_by_name ? task.created_by_name.charAt(0) : "S"}
                </div>
                <span className="text-[11px] font-medium text-slate-550 dark:text-slate-400 max-w-[70px] truncate" title={task.created_by_name || "System"}>
                  {task.created_by_name ? task.created_by_name.split(" ")[0] : "System"}
                </span>
              </>
            )}
          </div>

          {/* Assignee Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">To:</span>
            {task.assigned_to_name && task.assigned_to_name !== "Unassigned" ? (
              task.assigned_to === currentUserId ? (
                <>
                  <div className="h-5 w-5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900/50 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center uppercase shadow-inner">
                    Y
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    You
                  </span>
                </>
              ) : (
                <>
                  <div className="h-5 w-5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900/50 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center uppercase shadow-inner">
                    {task.assigned_to_name.charAt(0)}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 max-w-[70px] truncate" title={task.assigned_to_name}>
                    {task.assigned_to_name.split(" ")[0]}
                  </span>
                </>
              )
            ) : (
              <>
                <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  P
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Personal
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}