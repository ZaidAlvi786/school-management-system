"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Building2,
  GraduationCap,
  UserCheck,
  BookOpen,
  FileText,
  Brain,
  Users,
  Calendar,
  Upload,
  BarChart3,
  Home,
  LogOut,
  QrCode,
  Settings,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "./logout-button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const principalNavItems: NavItem[] = [
  { title: "Dashboard", href: "/principal", icon: Home },
  { title: "Schools", href: "/principal/schools", icon: Building2 },
  { title: "Classes", href: "/principal/classes", icon: GraduationCap },
  { title: "Teachers", href: "/principal/teachers", icon: UserCheck },
  { title: "Profile Settings", href: "/principal/profile", icon: Settings },
];

const teacherNavItems: NavItem[] = [
  { title: "Dashboard", href: "/teacher", icon: Home },
  { title: "Students", href: "/teacher/students", icon: Users },
  { title: "Grades", href: "/teacher/grades", icon: BookOpen },
  { title: "Homework", href: "/teacher/homework", icon: FileText },
  { title: "Attendance", href: "/teacher/attendance", icon: Calendar },
  { title: "QR Codes", href: "/teacher/qr-codes", icon: QrCode },
  { title: "Paper Generator", href: "/teacher/paper-generator", icon: Brain },
  { title: "AI Grading", href: "/teacher/ai-grading", icon: Brain },
  { title: "Syllabus", href: "/teacher/syllabus", icon: BookOpen },
  { title: "Materials", href: "/teacher/materials", icon: Upload },
  { title: "Profile Settings", href: "/teacher/profile", icon: Settings },
];

const adminNavItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: Home },
  { title: "Campuses", href: "/admin/schools", icon: Building2 },
  { title: "Principals", href: "/admin/principals", icon: UserCheck },
  { title: "Classes", href: "/admin/classes", icon: GraduationCap },
  { title: "Teachers", href: "/admin/teachers", icon: UserCheck },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Insights", href: "/admin/insights", icon: Brain },
  { title: "Warnings", href: "/admin/warnings", icon: BarChart3 },
  { title: "Profile Settings", href: "/admin/profile", icon: Settings },
];

const studentNavItems: NavItem[] = [
  { title: "Dashboard", href: "/student", icon: Home },
  { title: "My Grades", href: "/student/grades", icon: BookOpen },
  { title: "Attendance", href: "/student/attendance", icon: Calendar },
  { title: "Homework", href: "/student/homework", icon: FileText },
  { title: "Syllabus", href: "/student/syllabus", icon: BookOpen },
  { title: "Materials", href: "/student/materials", icon: Upload },
  { title: "Forecast", href: "/student/forecast", icon: BarChart3 },
  { title: "Profile Settings", href: "/student/profile", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  if (!session) return null;

  let navItems: NavItem[] = [];
  let basePath = "";

  if (session.user.role === "principal") {
    navItems = principalNavItems;
    basePath = "/principal";
  } else if (session.user.role === "teacher") {
    navItems = teacherNavItems;
    basePath = "/teacher";
  } else if (session.user.role === "admin") {
    navItems = adminNavItems;
    basePath = "/admin";
  } else if (session.user.role === "student") {
    navItems = studentNavItems;
    basePath = "/student";
  } else if (session.user.role === "parent") {
    // Parent doesn't use sidebar, but we can add it if needed
    return null;
  } else {
    return null; // No sidebar for other roles yet
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 right-4 z-50 lg:hidden p-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl z-50 transition-transform duration-300 ease-in-out",
          // On mobile: slide in from left when open, hide when closed
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header with Close Button */}
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">School Portal</h2>
                <p className="text-xs text-slate-400 capitalize">{session.user.role}</p>
              </div>
            </div>
            {/* Close Button - Only visible on mobile */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                )}
              >
                        <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white group-hover:scale-110"
                  )}
                />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-700">
            <div className="mb-3 px-4 py-2 rounded-lg bg-slate-800/50">
              <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}

