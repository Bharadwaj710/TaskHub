"use client";

import { GeneratedImage, aiService } from "@/services/aiService";
import { Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ImageGalleryProps {
  generations: GeneratedImage[];
  onDelete: () => void;
}

export function ImageGallery({ generations, onDelete }: ImageGalleryProps) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await aiService.deleteGeneration(id);
      if (res.success) {
        toast.success("Image deleted");
        onDelete();
      } else {
        toast.error(res.message || "Failed to delete image");
      }
    } catch {
      toast.error("Network error deleting image");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `TaskHub_${type.replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Failed to download image");
    }
  };

  if (generations.length === 0) {
    return (
      <div className="h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
        <p className="text-sm font-medium">No images generated yet</p>
        <p className="text-xs mt-1">Use the controls on the left to start generating</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {generations.map((gen) => (
        <div key={gen.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gen.image_url} alt={gen.image_type} className="object-cover w-full h-full" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => handleDownload(gen.image_url, gen.image_type)}
                className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-lg text-white transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDelete(gen.id)}
                disabled={deleting === gen.id}
                className="p-1.5 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-lg text-white transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div>
              <div className="text-xs font-bold text-white line-clamp-1">{gen.image_type}</div>
              <div className="text-[10px] text-white/70 line-clamp-2 mt-0.5" title={gen.prompt_used}>{gen.prompt_used}</div>
            </div>
          </div>
          
          {deleting === gen.id && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
