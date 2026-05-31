"use client";

import { useCallback, useEffect, useState } from "react";
import { aiService, GeneratedImage } from "@/services/aiService";
import { taskService } from "@/services/taskService";
import { Task } from "@/types";
import { GenerationControls } from "./GenerationControls";
import { ImageGallery } from "./ImageGallery";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function AIStudioInterface({ taskId }: { taskId: number }) {
  const [task, setTask] = useState<Task | null>(null);
  const [generations, setGenerations] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [taskRes, genRes] = await Promise.all([
        taskService.getTask(taskId),
        aiService.getTaskGenerations(taskId)
      ]);
      
      if (taskRes.success) {
        setTask(taskRes.data);
      }
      if (genRes.success) {
        setGenerations(genRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load AI Studio data");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerationCompleted = () => {
    loadData(); // Refresh the gallery
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!task) {
    return <div className="text-center mt-20 text-slate-500">Task not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">AI Studio: {task.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Generate professional product photography variations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Original & Controls */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3">Original Product</h3>
            {task.product_image_url ? (
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={task.product_image_url} alt="Original Product" className="object-contain w-full h-full" />
              </div>
            ) : (
              <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
                No image uploaded
              </div>
            )}
          </div>
          
          <GenerationControls taskId={taskId} onGenerationCompleted={handleGenerationCompleted} disabled={!task.product_image_url} />
        </div>

        {/* Right Column: Gallery */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Generated Variations</h3>
              <div className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full">
                {generations.length} / 8 Images
              </div>
            </div>
            
            <ImageGallery generations={generations} onDelete={loadData} />
          </div>
        </div>
      </div>
    </div>
  );
}
