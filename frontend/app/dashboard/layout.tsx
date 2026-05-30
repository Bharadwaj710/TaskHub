"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  CheckSquare,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight,
  LayoutDashboard,
  Users,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Inner layout that consumes auth context
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAdmin, clearAuth } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('My Tasks');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata;
        setUserName(meta.full_name || meta.name || 'User');
        setUserEmail(session.user.email || '');
        setUserAvatar(meta.avatar_url || meta.picture || '');
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth();
    router.push('/login');
  };

  // Role-based navigation: admin sees management items, users see their tasks
  const userNavItems = [
    { name: 'My Tasks', icon: ClipboardList, href: '/dashboard' },
  ];

  const adminNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Users', icon: Users, href: '/dashboard/admin/users' }
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans transition-colors duration-300">
      {/* Mobile Top Bar */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors duration-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-slate-50 tracking-tight">NexTask</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Sidebar - Desktop & Mobile overlay */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-colors duration-300
      `}>
        <div className="space-y-8">
          {/* Logo & Mobile Close button */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <CheckSquare className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-slate-900 dark:text-slate-50 tracking-tight">NexTask</span>
                {/* Role badge */}
                {isAdmin && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Close sidebar button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.name);
                    setMobileMenuOpen(false);
                    router.push(item.href);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/55 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-5 pt-5 border-t border-slate-200 dark:border-slate-800">
          {/* User Profile Info Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center gap-3 min-w-0">
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt={userName} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-slate-100 dark:ring-slate-800" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-sm shadow-inner shrink-0 animate-pulse">
                  {userName.charAt(0) || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-50 truncate leading-none mb-1">{userName}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate leading-none">{userEmail}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </div>

          {/* Mode Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 flex items-center gap-1 transition-colors duration-300">
            <button
              onClick={() => toggleTheme('light')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-900 shadow-xs border border-slate-200/20 dark:border-slate-800/20 text-slate-700 dark:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
              }`}
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              onClick={() => toggleTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-900 shadow-xs border border-slate-200/20 dark:border-slate-800/20 text-slate-700 dark:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
              }`}
            >
              <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span>Dark</span>
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-sm font-medium tracking-tight cursor-pointer transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:h-screen md:overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {children}
      </main>

      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/25 z-30 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

// Outer layout wraps with AuthProvider so all children can access auth context
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
