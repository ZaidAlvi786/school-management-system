"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import {
  BookOpen,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

interface Stats {
  students: number;
  grades: number;
  homework: number;
  attendance: number;
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats>({ students: 0, grades: 0, homework: 0, attendance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
    redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "teacher") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    try {
      const [studentsRes, gradesRes, homeworkRes, attendanceRes] = await Promise.all([
        fetch("/api/teacher/students").catch(() => null),
        fetch("/api/grades").catch(() => null),
        fetch("/api/homework").catch(() => null),
        fetch("/api/attendance").catch(() => null),
      ]);

      const students = studentsRes?.ok ? (await studentsRes.json())?.students || [] : [];
      const grades = gradesRes?.ok ? await gradesRes.json() : [];
      const homework = homeworkRes?.ok ? await homeworkRes.json() : [];
      const attendance = attendanceRes?.ok ? await attendanceRes.json() : [];

      setStats({
        students: students.length || 0,
        grades: grades.length || 0,
        homework: homework.length || 0,
        attendance: attendance.length || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "My Students",
      value: stats.students,
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
    },
    {
      title: "Grades Recorded",
      value: stats.grades,
      icon: BookOpen,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
    },
    {
      title: "Homework Assigned",
      value: stats.homework,
      icon: FileText,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
    },
    {
      title: "Attendance Records",
      value: stats.attendance,
      icon: Calendar,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
    },
  ];

  const menuItems = [
    { title: "Students", href: "/teacher/students", icon: Users, gradient: "from-blue-500 to-cyan-500", bgGradient: "from-blue-50 to-cyan-50" },
    { title: "Grades", href: "/teacher/grades", icon: BookOpen, gradient: "from-purple-500 to-pink-500", bgGradient: "from-purple-50 to-pink-50" },
    { title: "Homework", href: "/teacher/homework", icon: FileText, gradient: "from-green-500 to-emerald-500", bgGradient: "from-green-50 to-emerald-50" },
    { title: "Attendance", href: "/teacher/attendance", icon: Calendar, gradient: "from-orange-500 to-red-500", bgGradient: "from-orange-50 to-red-50" },
    { title: "Paper Generator", href: "/teacher/paper-generator", icon: FileText, gradient: "from-indigo-500 to-purple-500", bgGradient: "from-indigo-50 to-purple-50" },
    { title: "AI Grading", href: "/teacher/ai-grading", icon: BookOpen, gradient: "from-teal-500 to-cyan-500", bgGradient: "from-teal-50 to-cyan-50" },
    { title: "Syllabus", href: "/teacher/syllabus", icon: BookOpen, gradient: "from-rose-500 to-pink-500", bgGradient: "from-rose-50 to-pink-50" },
    { title: "Materials", href: "/teacher/materials", icon: FileText, gradient: "from-amber-500 to-orange-500", bgGradient: "from-amber-50 to-orange-50" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8 animate-slide-up">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {session?.user?.name}!
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Here&apos;s your teaching overview for today.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="stagger-item card-hover border-2 hover:shadow-xl overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`p-4 bg-gradient-to-br ${stat.bgGradient} rounded-xl`}>
                        <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
            </CardContent>
          </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="stagger-item"
                    style={{ animationDelay: `${(index + 4) * 0.1}s` }}
                  >
                    <Card className="h-full card-hover border-2 hover:border-primary/50 cursor-pointer overflow-hidden group">
                      <div className={`bg-gradient-to-br ${item.bgGradient} p-6`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 bg-gradient-to-br ${item.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <CardTitle className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </CardTitle>
                      </div>
                      <CardContent className="p-4">
                        <Button className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-md text-sm">
                          Open
                        </Button>
            </CardContent>
          </Card>
              </Link>
                );
              })}
            </div>
          </div>

          {/* Today's Tasks */}
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle>Today&apos;s Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-900">Pending grades to record</p>
                    <p className="text-sm text-gray-600">You have assignments to grade</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-900">Attendance marked</p>
                    <p className="text-sm text-gray-600">All students present today</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
