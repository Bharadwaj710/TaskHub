import { AIStudioInterface } from "@/components/dashboard/ai-studio/AIStudioInterface";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/40 p-4 md:p-8">
      <AIStudioInterface taskId={parseInt(id, 10)} />
    </div>
  );
}
