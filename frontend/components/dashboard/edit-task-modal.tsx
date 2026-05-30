"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { taskService } from "@/services/taskService";
import { UserProfile, Task } from "@/types";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditTaskModalProps {
  task: Task;
  currentUserId: string | null;
  onTaskUpdated: () => void;
}

export function EditTaskModal({ task, currentUserId, onTaskUpdated }: EditTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [assignedTo, setAssignedTo] = useState<string>(task.assigned_to || "unassigned");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      // Re-sync task data if it changed outside
      setTitle(task.title);
      setDescription(task.description || "");
      setAssignedTo(task.assigned_to || "unassigned");

      const loadUsers = async () => {
        setFetchingUsers(true);
        try {
          const res = await userService.getUsers();
          if (res.success) {
            setUsers(res.data);
          }
        } catch (error) {
          console.error("Error loading users:", error);
        } finally {
          setFetchingUsers(false);
        }
      };
      loadUsers();
    }
  }, [open, task.title, task.description, task.assigned_to]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const targetAssignee = assignedTo === "unassigned" ? null : assignedTo;
      const res = await taskService.updateTask(task.id, {
        title,
        description,
        assigned_to: targetAssignee || undefined,
      });

      if (res.success) {
        setOpen(false);
        
        if (targetAssignee && targetAssignee !== task.assigned_to) {
          toast.success("Task updated!", {
            description: "Assignment email notification dispatched in background.",
          });
        } else {
          toast.success("Task updated successfully!");
        }
        
        onTaskUpdated();
      } else {
        toast.error(res.message || "Failed to update task");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task due to network error.");
    } finally {
      setLoading(false);
    }
  };

  const assignableUsers = users.filter((user) => user.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button 
          type="button"
          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          title="Edit Task"
        >
          <Pencil className="h-4.5 w-4.5" />
        </button>
      } />
      <DialogContent className="sm:max-w-[460px] rounded-2xl p-7 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Edit task details</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Modify the task title, description, or teammate assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 pt-4 pb-2">
          {task.product_image_url ? (
            <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={task.product_image_url} alt="Product" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">No Image</span>
            </div>
          )}
          <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-col justify-center">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Product Image</span>
            <span className="text-xs">{task.product_image_url ? "Image provided during creation." : "No product image uploaded."}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Task Title</Label>
            <Input
              id="edit-title"
              placeholder="e.g. Design Landing Page Hero Section"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-xl h-11 px-4 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-2xs transition-colors duration-300"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="edit-description" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Provide a comprehensive breakdown of the deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-slate-900 dark:text-slate-50 rounded-xl px-4 py-3 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-2xs min-h-[125px] resize-none transition-colors duration-300"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="edit-assignee" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Assignee</Label>
            <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || "unassigned")}>
              <SelectTrigger className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-xl h-11 px-4 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500 shadow-2xs cursor-pointer transition-colors duration-300">
                <SelectValue placeholder={fetchingUsers ? "Loading team members..." : "Select team member"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg dark:shadow-none">
                <SelectItem value="unassigned" className="text-xs font-medium px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Personal</SelectItem>
                {assignableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id} className="text-xs font-medium px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3 justify-end">
            <DialogClose render={
              <Button type="button" variant="outline" className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 bg-transparent cursor-pointer rounded-xl h-11 text-sm font-semibold px-5 transition-colors">
                Cancel
              </Button>
            } />
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer rounded-xl h-11 text-sm px-5 transition-colors shadow-sm shadow-indigo-500/10"
            >
              {loading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
