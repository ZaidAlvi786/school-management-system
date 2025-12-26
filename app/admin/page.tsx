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
  Building2,
  GraduationCap,
  UserCheck,
  Brain,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react";

interface Stats {
  campuses: number;
  principals: number;
  classes: number;
  teachers: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats>({ campuses: 0, principals: 0, classes: 0, teachers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "admin" && session?.user?.role !== "principal") {
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
      const [campusesRes, principalsRes, classesRes, teachersRes] = await Promise.all([
        fetch("/api/admin/campuses"),
        fetch("/api/admin/principals"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/teachers"),
      ]);

      const campuses = campusesRes.ok ? await campusesRes.json() : [];
      const principals = principalsRes.ok ? await principalsRes.json() : [];
      const classes = classesRes.ok ? await classesRes.json() : [];
      const teachers = teachersRes.ok ? await teachersRes.json() : [];

      setStats({
        campuses: campuses.length || 0,
        principals: principals.length || 0,
        classes: classes.length || 0,
        teachers: teachers.length || 0,
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
      title: "Campuses",
      value: stats.campuses,
      icon: Building2,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      change: "+1",
    },
    {
      title: "Principals",
      value: stats.principals,
      icon: UserCheck,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      change: "+2",
    },
    {
      title: "Classes",
      value: stats.classes,
      icon: GraduationCap,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      change: "+5",
    },
    {
      title: "Teachers",
      value: stats.teachers,
      icon: Users,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      change: "+8",
    },
  ];

  const menuItems = [
    {
      title: "Campus Management",
      description: "Manage campuses for your school",
      href: "/admin/schools",
      icon: Building2,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
    },
    {
      title: "Principal Management",
      description: "Add and manage principals",
      href: "/admin/principals",
      icon: UserCheck,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
    },
    {
      title: "Class Management",
      description: "Manage classes and sections",
      href: "/admin/classes",
      icon: GraduationCap,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
    },
    {
      title: "Teacher Assignment",
      description: "Assign teachers to classes",
      href: "/admin/teachers",
      icon: UserCheck,
      gradient: "from-teal-500 to-cyan-500",
      bgGradient: "from-teal-50 to-cyan-50",
    },
    {
      title: "AI Insights",
      description: "View AI-generated insights",
      href: "/admin/insights",
      icon: Brain,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
    },
    {
      title: "Early Warning System",
      description: "AI-powered early warnings",
      href: "/admin/warnings",
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-50 to-rose-50",
    },
    {
      title: "Analytics",
      description: "School-wide analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      gradient: "from-indigo-500 to-blue-500",
      bgGradient: "from-indigo-50 to-blue-50",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {session?.user?.name}!
            </h1>
            <p className="text-gray-600">Here's your school management overview.</p>
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
                        <div className="flex items-center gap-1 mt-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">{stat.change} this month</span>
                        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <CardTitle className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          {item.description}
                        </CardDescription>
                      </div>
                      <CardContent className="p-6 pt-4">
                        <Button className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-md">
                          Open {item.title.split(" ")[0]}
                          <Icon className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* System Status */}
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <CardTitle>System Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="font-medium text-gray-900">System Operational</p>
                  </div>
                  <p className="text-sm text-gray-600">All services running normally</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="font-medium text-gray-900">AI Services Active</p>
                  </div>
                  <p className="text-sm text-gray-600">AI features available</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <p className="font-medium text-gray-900">Database Connected</p>
                  </div>
                  <p className="text-sm text-gray-600">All data synced</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
