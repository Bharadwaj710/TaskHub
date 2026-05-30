"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";
import { taskService } from "@/services/taskService";
import { Task } from "@/types";
import { TaskCard } from "@/components/dashboard/task-card";
import { 
  Loader2, 
  Search, 
  FileText, 
  Activity, 
  CheckCircle2, 
  Clock, 
  ChevronDown
} from "lucide-react";
import { CreateTaskModal } from "@/components/dashboard/create-task-modal";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityLog {
  id: number;
  task_id: number;
  task_title: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Bharadwaj");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const router = useRouter();
  const { isAdmin } = useAuth();

  const fetchTasks = async () => {
    try {
      const taskRes = await taskService.getTasks();
      if (taskRes.success) {
        setTasks(taskRes.data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      const actRes = await taskService.getActivities();
      if (actRes.success) {
        setActivities(actRes.data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const name = session.user.user_metadata.full_name || "User";
        setUserName(name.split(" ")[0]); // Get first name
        setCurrentUserId(session.user.id);

        const syncRes = await authService.syncUser();
        if (!syncRes.success) {
          console.error("Failed to sync user with backend:", syncRes.message);
        }

        await Promise.all([fetchTasks(), fetchActivities()]);
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    const channel = supabase
      .channel("tasks-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          console.log("Real-time database change detected:", payload);
          fetchTasks();
          fetchActivities();
        }
      )
      .subscribe((status) => {
        console.log("Real-time subscription status:", status);
      });

    const pollInterval = setInterval(() => {
      fetchTasks();
      fetchActivities();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [loading]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "All" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const pendingTasks = tasks.filter(t => t.status === "Pending").length;
  const yourPendingTasks = tasks.filter(t => 
    t.status !== "Completed" && 
    (t.assigned_to === currentUserId || (!t.assigned_to && t.created_by === currentUserId))
  ).length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Donut SVG circumference calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-8 sm:py-6 max-w-7xl mx-auto space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search tasks, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12 h-11 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-xl text-sm shadow-2xs text-slate-900 dark:text-slate-50 transition-colors duration-300 w-full"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5.5 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-1.5 font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <span>⌘</span>K
          </kbd>
        </div>

        {/* Action icons */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {isAdmin && (
            <CreateTaskModal currentUserId={currentUserId} onTaskCreated={fetchTasks} />
          )}
        </div>
      </div>

      {/* Greeting banner */}
      <div className="space-y-1.5 py-1 sm:py-2">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-semibold tracking-[-0.03em] leading-tight text-slate-900 dark:text-slate-50">
          Good morning, {userName}! 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening with your tasks today.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Total Tasks</span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">{totalTasks}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-500 dark:text-indigo-400 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">In Progress</span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">{inProgressTasks}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-amber-500 dark:text-amber-400 shrink-0">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Completed</span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">{completedTasks}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-500 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Your Pending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Your Pending</span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">{yourPendingTasks}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 text-violet-500 dark:text-violet-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className="flex justify-center pt-2 pb-1 animate-bounce text-slate-400 dark:text-slate-550">
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => document.getElementById("my-tasks-section")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Scroll down to view tasks</span>
          <ChevronDown className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      {/* Main Workspace Section: Tasks Grid */}
      <div id="my-tasks-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Table Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-850 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">My Tasks</h3>
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 sm:border-l border-slate-200 dark:border-slate-800 sm:pl-6 py-0.5 border-l-0">
              {["All", "In Progress", "Pending", "Completed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === status
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Container */}
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 mb-4">
              <FileText className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No tasks found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px]">
              Try adjusting your filters or click Create Task to add one.
            </p>
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-slate-950/40 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-slate-100 dark:border-slate-850/20">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} currentUserId={currentUserId} onStatusChanged={fetchTasks} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Grid Rows: Upcoming Deadlines, Progress Donut & Activity Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tasks to Complete */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Tasks to Complete</h3>
            <button 
              onClick={() => {
                setStatusFilter("All");
                document.getElementById("my-tasks-section")?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-3.5">
            {tasks
              .filter(t => t.status !== "Completed")
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 3)
              .map((task) => {
                // Dynamic priority assignment based on task creation/assignment freshness
                const taskDate = new Date(task.created_at);
                const hoursDiff = (new Date().getTime() - taskDate.getTime()) / (1000 * 3600);
                let taskPriority: "High" | "Medium" | "Low" = "Low";
                if (hoursDiff <= 24) {
                  taskPriority = "High";
                } else if (hoursDiff <= 48) {
                  taskPriority = "Medium";
                }

                const priorityColors = {
                  High: "text-red-600 bg-red-50 border-red-100",
                  Medium: "text-amber-600 bg-amber-50 border-amber-100",
                  Low: "text-emerald-600 bg-emerald-50 border-emerald-100",
                };

                return (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-colors">
                    <div className="space-y-1">
                      <h4 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-[280px]">
                        {task.title}
                      </h4>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                        {task.assigned_to_name === "Unassigned" || !task.assigned_to_name ? "Personal Task" : `Assigned to: ${task.assigned_to_name.split(" ")[0]}`}
                      </p>
                    </div>
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${priorityColors[taskPriority]}`}>
                      {taskPriority}
                    </div>
                  </div>
                );
              })}

            {tasks.filter(t => t.status !== "Completed").length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
                No tasks to complete.
              </div>
            )}
          </div>
        </div>

        {/* Task Completion Progress Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Task Completion</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
            {/* SVG Donut Chart */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-emerald-500 transition-all duration-700 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">{completionPercentage}%</span>
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">Completed</span>
              </div>
            </div>

            {/* Legend Details */}
            <div className="space-y-3 w-full max-w-[180px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Completed</span>
                </div>
                <span className="text-slate-900 dark:text-slate-50 font-bold">{completedTasks}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>In Progress</span>
                </div>
                <span className="text-slate-900 dark:text-slate-50 font-bold">{inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                  <span>Pending</span>
                </div>
                <span className="text-slate-900 dark:text-slate-50 font-bold">{pendingTasks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Timeline</h3>
            <button 
              onClick={fetchActivities}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4 max-h-[190px] overflow-y-auto pr-1">
            {activities.slice(0, 4).map((log) => {
              const logDate = new Date(log.created_at);
              return (
                <div key={log.id} className="flex gap-3 text-xs leading-normal">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="w-0.5 grow bg-slate-100 dark:bg-slate-800/85 my-1" />
                  </div>
                  <div className="space-y-1 pb-1">
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {log.performed_by === currentUserId ? "You" : log.performed_by_name}
                      </span>{" "}
                      {log.action.toLowerCase()}{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        &ldquo;{log.task_title}&rdquo;
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      {logDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • {logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
                No recent activities.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}