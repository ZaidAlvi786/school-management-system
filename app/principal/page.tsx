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
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface Stats {
  schools: number;
  classes: number;
  teachers: number;
  students: number;
}

export default function PrincipalDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats>({ schools: 0, classes: 0, teachers: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "principal") {
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
      const [schoolsRes, classesRes, teachersRes] = await Promise.all([
        fetch("/api/admin/schools"),
        fetch("/api/admin/classes"),
        fetch("/api/admin/teachers"),
      ]);

      const schools = schoolsRes.ok ? await schoolsRes.json() : [];
      const classes = classesRes.ok ? await classesRes.json() : [];
      const teachers = teachersRes.ok ? await teachersRes.json() : [];

      // Count students from classes
      let studentsCount = 0;
      classes.forEach((cls: any) => {
        studentsCount += cls.sections?.reduce((acc: number, sec: any) => acc + (sec.currentStrength || 0), 0) || 0;
      });

      setStats({
        schools: schools.length || 0,
        classes: classes.length || 0,
        teachers: teachers.length || 0,
        students: studentsCount,
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
      title: "Schools",
      value: stats.schools,
      icon: Building2,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      change: "+2",
    },
    {
      title: "Classes",
      value: stats.classes,
      icon: GraduationCap,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      change: "+5",
    },
    {
      title: "Teachers",
      value: stats.teachers,
      icon: UserCheck,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      change: "+3",
    },
    {
      title: "Students",
      value: stats.students,
      icon: Users,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      change: "+12",
    },
  ];

  const menuItems = [
    {
      title: "School Overview",
      description: "View your school and campuses",
      href: "/principal/schools",
      icon: Building2,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
    },
    {
      title: "Class Management",
      description: "Manage classes, sections, and assign class incharge",
      href: "/principal/classes",
      icon: GraduationCap,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
    },
    {
      title: "Teacher Management",
      description: "Add teachers and assign to subjects",
      href: "/principal/teachers",
      icon: UserCheck,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
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
            <p className="text-gray-600">Here&apos;s what&apos;s happening with your school today.</p>
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

          {/* Recent Activity / Alerts */}
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <CardTitle>Recent Updates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-900">New teacher assigned</p>
                    <p className="text-sm text-gray-600">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-900">Class capacity updated</p>
                    <p className="text-sm text-gray-600">5 hours ago</p>
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
