"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import LogoutButton from "@/components/logout-button";
import {
  BookOpen,
  FileText,
  Calendar,
  GraduationCap,
  TrendingUp,
  Download,
  BarChart3,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "student") {
      redirect("/");
    }
    if (status === "authenticated") {
      setLoading(false);
    }
  }, [status, session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      title: "My Grades",
      description: "View your grades and performance",
      href: "/student/grades",
      icon: BookOpen,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      buttonText: "View Grades",
    },
    {
      title: "AI Performance Forecast",
      description: "AI prediction of your performance",
      href: "/student/forecast",
      icon: TrendingUp,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      buttonText: "View Forecast",
    },
    {
      title: "Attendance",
      description: "View your attendance record",
      href: "/student/attendance",
      icon: Calendar,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      buttonText: "View Attendance",
    },
    {
      title: "Syllabus Progress",
      description: "Track syllabus completion",
      href: "/student/syllabus",
      icon: GraduationCap,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      buttonText: "View Syllabus",
    },
    {
      title: "Homework",
      description: "View assigned homework",
      href: "/student/homework",
      icon: FileText,
      gradient: "from-indigo-500 to-purple-500",
      bgGradient: "from-indigo-50 to-purple-50",
      buttonText: "View Homework",
    },
    {
      title: "Materials",
      description: "Access study materials",
      href: "/student/materials",
      icon: Download,
      gradient: "from-teal-500 to-cyan-500",
      bgGradient: "from-teal-50 to-cyan-50",
      buttonText: "View Materials",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Welcome back, {session?.user?.name}! 👋
                </h1>
                <p className="text-gray-600 text-lg">
                  Here&apos;s everything you need for your academic journey.
                </p>
              </div>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card className="h-full card-hover border-2 hover:border-primary/50 cursor-pointer overflow-hidden group transition-all duration-300 hover:shadow-2xl">
                    <div className={`bg-gradient-to-br ${item.bgGradient} p-6 relative overflow-hidden`}>
                      {/* Decorative background pattern */}
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                        <div className={`w-full h-full bg-gradient-to-br ${item.gradient} rounded-full blur-3xl`}></div>
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-4 bg-gradient-to-br ${item.gradient} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-7 w-7 text-white" />
                          </div>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-gray-700 text-sm">
                          {item.description}
                        </CardDescription>
                      </div>
                    </div>
                    <CardContent className="p-6 bg-white">
                      <Button 
                        className={`w-full bg-gradient-to-r ${item.gradient} hover:opacity-90 text-white shadow-md text-sm font-medium transition-all duration-300 group-hover:shadow-xl`}
                        size="lg"
                      >
                        {item.buttonText}
                        <Icon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Stats or Info Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 hover:shadow-xl transition-shadow duration-300 animate-slide-up">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <CardTitle>Quick Tips</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Stay on top of your grades</p>
                      <p className="text-sm text-gray-600">Check your grades regularly to track your progress</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="h-2 w-2 bg-green-500 rounded-full mt-2 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Complete homework on time</p>
                      <p className="text-sm text-gray-600">View and submit your assignments before deadlines</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <div className="h-2 w-2 bg-purple-500 rounded-full mt-2 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Track your attendance</p>
                      <p className="text-sm text-gray-600">Monitor your attendance to maintain good standing</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-shadow duration-300 animate-slide-up">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  <CardTitle>Your Academic Journey</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Overall Progress</span>
                      <span className="text-2xl font-bold">85%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: "85%" }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-indigo-600">A+</p>
                      <p className="text-sm text-gray-600">Current Grade</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">98%</p>
                      <p className="text-sm text-gray-600">Attendance</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
