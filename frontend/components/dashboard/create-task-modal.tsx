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
import { UserProfile } from "@/types";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateTaskModalProps {
  currentUserId: string | null;
  onTaskCreated: () => void;
}

export function CreateTaskModal({ currentUserId, onTaskCreated }: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (open) {
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
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      let product_image_url: string | undefined = undefined;

      if (imageFile) {
        const uploadRes = await taskService.uploadProductImage(imageFile);
        if (!uploadRes.success) {
          toast.error(uploadRes.message || "Failed to upload image");
          setLoading(false);
          return;
        }
        product_image_url = uploadRes.data.url;
      }

      const res = await taskService.createTask({
        title,
        description,
        assigned_to: assignedTo && assignedTo !== "unassigned" ? assignedTo : undefined,
        product_image_url,
      });
      if (res.success) {
        setOpen(false);
        setTitle("");
        setDescription("");
        setAssignedTo("");
        setImageFile(null);
        
        if (assignedTo && assignedTo !== "unassigned") {
          toast.success("Task created!", {
            description: "Assignment email notification dispatched in background.",
          });
        } else {
          toast.success("Task created successfully!");
        }
        
        onTaskCreated();
      } else {
        toast.error(res.message || "Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task due to network error.");
    } finally {
      setLoading(false);
    }
  };

  const assignableUsers = users.filter((user) => user.id !== currentUserId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="group relative flex h-11 w-11 hover:w-[140px] items-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-300 ease-in-out overflow-hidden cursor-pointer pl-3 shrink-0">
          <Plus className="h-5 w-5 shrink-0" />
          <span className="ml-2 text-sm font-medium tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
            Create Task
          </span>
        </button>
      } />
      <DialogContent className="sm:max-w-[460px] rounded-2xl p-7 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Create new task</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Define the task scope and assign it to a team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Task Title</Label>
            <Input
              id="title"
              placeholder="e.g. Design Landing Page Hero Section"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-xl h-11 px-4 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-2xs transition-colors duration-300"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide a comprehensive breakdown of the deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-xl px-4 py-3 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-2xs min-h-[125px] resize-none transition-colors duration-300"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="assignee" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Assignee</Label>
            <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val || "")}>
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

          <div className="space-y-1.5">
            <Label htmlFor="product-image" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Product Image (Optional)</Label>
            <Input
              id="product-image"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-xl px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500 shadow-2xs transition-colors duration-300 file:border-0 file:bg-indigo-50 file:text-indigo-600 file:text-xs file:font-semibold file:px-3 file:py-1 file:rounded-full file:mr-3 hover:file:bg-indigo-100 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">Max size: 5MB. Formats: PNG, JPG, WEBP.</p>
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
                  Creating...
                </div>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
