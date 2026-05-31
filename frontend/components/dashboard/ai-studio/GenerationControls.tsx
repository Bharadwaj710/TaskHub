"use client";

import { useState } from "react";
import { aiService } from "@/services/aiService";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const MVP_TYPES = [
  { value: "White Background", label: "White Background (E-commerce)" },
  { value: "Luxury Background", label: "Luxury Theme (Marble/Gold)" },
  { value: "Creative Background", label: "Creative Theme (Lifestyle)" },
  { value: "Model Front", label: "Model Wearing (Front View)" },
  { value: "Model Side", label: "Model Wearing (Side Angle)" },
  { value: "Model Closeup", label: "Model Wearing (Close-up)" }
];

interface GenerationControlsProps {
  taskId: number;
  onGenerationCompleted: () => void;
  disabled: boolean;
}

export function GenerationControls({ taskId, onGenerationCompleted, disabled }: GenerationControlsProps) {
  const [selectedType, setSelectedType] = useState(MVP_TYPES[0].value);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pollingStatus, setPollingStatus] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setGenerating(true);
    setPollingStatus("Submitting job...");
    
    try {
      const res = await aiService.generateImage(taskId, prompt, selectedType);
      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to submit generation job");
      }
      
      const jobId = res.data.job_id;
      pollJobStatus(jobId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
      setGenerating(false);
      setPollingStatus("");
    }
  };

  const pollJobStatus = async (jobId: number) => {
    setPollingStatus("Generating... (this may take up to 30s)");
    
    const interval = setInterval(async () => {
      try {
        const res = await aiService.getJobStatus(jobId);
        if (res.success && res.data) {
          if (res.data.status === 'completed') {
            clearInterval(interval);
            setGenerating(false);
            setPollingStatus("");
            toast.success("Image generated successfully!");
            onGenerationCompleted();
          } else if (res.data.status === 'failed') {
            clearInterval(interval);
            setGenerating(false);
            setPollingStatus("");
            toast.error(`Generation failed: ${res.data.error_message}`);
          }
          // else continue polling
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000); // Poll every 3 seconds
  };

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Generate New Variation</h3>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Variation Type</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={generating || disabled}
            className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {MVP_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">AI Prompt</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating || disabled}
            placeholder="E.g., Place the product on a white marble podium with soft studio lighting..."
            className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
          />
        </div>

        <Button 
          onClick={handleGenerate}
          disabled={generating || disabled || !prompt.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 shadow-md shadow-indigo-500/20"
        >
          {generating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {pollingStatus}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generate Image
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
