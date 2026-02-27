import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  FileWarning,
  UploadCloud,
  LogOut,
  Loader2,
  Settings
} from "lucide-react";
import { motion } from "framer-motion";
import { CollegeHeader } from "@/components/college-header";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/reports", label: "Backlogs", icon: FileWarning },
  { href: "/upload", label: "Data Upload", icon: UploadCloud },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>; // Let App.tsx handle redirect
  }

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar */}
      <aside className="w-72 hidden md:flex flex-col border-r border-slate-200 bg-white relative z-10 shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <img
            src="/college.webp"
            alt="KITS Logo"
            className="w-12 h-12 object-contain rounded-lg"
          />
          <div>
            <h1 className="font-display font-bold text-xl leading-none tracking-tight text-slate-900">KITS AKSHAR</h1>
            <p className="text-xs text-primary font-medium tracking-wider mt-1">EXAM CELL</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative
                    ${isActive
                      ? "text-primary bg-primary/5 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 border border-primary/10 rounded-xl bg-primary/5"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? "text-primary" : "group-hover:text-primary"}`} />
                  <span className="relative z-10">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-200 mt-auto bg-slate-50/50">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="font-display font-bold text-primary">{user.username?.charAt(0).toUpperCase() || "A"}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.username}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-destructive bg-destructive/5 border border-destructive/10 hover:bg-destructive hover:text-white transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
          {/* College header on every page */}
          <CollegeHeader className="sticky top-0 z-20 shadow-sm" />

          <div className="p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
