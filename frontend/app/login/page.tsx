import { AuthButton } from "@/components/auth/auth-button";
import { CheckSquare, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white font-sans overflow-hidden">
      {/* Left panel - auth form */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-12 lg:p-16 relative z-10 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">TaskHub</span>
        </div>

        {/* Content */}
        <div className="max-w-[400px] w-full mx-auto my-auto py-12 space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Welcome back <br />
              to <span className="text-blue-600">TaskHub</span>
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sign in to continue managing your tasks and track your project progress.
            </p>
          </div>

          <div className="space-y-6">
            <AuthButton />
            
            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400">or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Secure card */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">Secure & Protected</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Your data is encrypted and always secure with us.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400">
          &copy; 2026 TaskHub. All rights reserved.
        </div>
      </div>

      {/* Right panel - illustration banner */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-tr from-blue-50/40 via-indigo-50/30 to-purple-50/40 relative items-center justify-center overflow-hidden border-l border-slate-100">
        {/* Subtle background circles for depth */}
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-blue-200/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[65%] h-[65%] bg-indigo-200/10 rounded-full blur-[80px]" />
        
        {/* Illustration */}
        <div className="relative w-[85%] max-w-[500px] h-[85%] max-h-[500px] flex items-center justify-center transition-all duration-500 hover:scale-102">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/login_illustration.png" 
            alt="Task management illustration" 
            className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(59,130,246,0.08)]"
          />
        </div>
      </div>
    </div>
  );
}
