"use client";

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
];

const studentNavItems: NavItem[] = [
  { title: "Dashboard", href: "/student", icon: Home },
  { title: "My Grades", href: "/student/grades", icon: BookOpen },
  { title: "Attendance", href: "/student/attendance", icon: Calendar },
  { title: "Homework", href: "/student/homework", icon: FileText },
  { title: "Syllabus", href: "/student/syllabus", icon: BookOpen },
  { title: "Materials", href: "/student/materials", icon: Upload },
  { title: "Forecast", href: "/student/forecast", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

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
  } else {
    return null; // No sidebar for other roles yet
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl z-50">
      <div className="flex flex-col h-full">
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">School Portal</h2>
              <p className="text-xs text-slate-400 capitalize">{session.user.role}</p>
            </div>
          </div>
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
  );
}

