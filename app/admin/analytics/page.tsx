"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { BarChart3, Users, GraduationCap, BookOpen, TrendingUp, School } from "lucide-react";

interface Analytics {
  overview: {
    totalSchools: number;
    totalCampuses: number;
    totalClasses: number;
    totalSections: number;
    totalStudents: number;
    totalTeachers: number;
    averageGrade: string;
    attendanceRate: string;
  };
  classStats: Array<{
    className: string;
    level: number;
    sections: number;
    students: number;
    averageGrade: string;
  }>;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
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
      fetchAnalytics();
    }
  }, [status]);

  const fetchAnalytics = async () => {
    try {
      const { getAnalytics } = await import("@/lib/fastapi-client");
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" className="hover:bg-indigo-50">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Analytics
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">{session?.user?.name}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">School-Wide Analytics</h2>
          <p className="text-gray-600">Comprehensive overview of school statistics and performance metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-6">
              <CardHeader className="p-0 flex flex-row items-center justify-between">
                <CardTitle className="text-white text-sm font-medium">Total Schools</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <School className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="text-3xl font-bold text-white">{analytics.overview.totalSchools}</div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-2 hover:border-green-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-6">
              <CardHeader className="p-0 flex flex-row items-center justify-between">
                <CardTitle className="text-white text-sm font-medium">Total Students</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="text-3xl font-bold text-white">{analytics.overview.totalStudents}</div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-2 hover:border-purple-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6">
              <CardHeader className="p-0 flex flex-row items-center justify-between">
                <CardTitle className="text-white text-sm font-medium">Total Teachers</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="text-3xl font-bold text-white">{analytics.overview.totalTeachers}</div>
              </CardContent>
            </div>
          </Card>

          <Card className="border-2 hover:border-orange-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6">
              <CardHeader className="p-0 flex flex-row items-center justify-between">
                <CardTitle className="text-white text-sm font-medium">Total Classes</CardTitle>
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="text-3xl font-bold text-white">{analytics.overview.totalClasses}</div>
              </CardContent>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 hover:border-green-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span>Average Grade</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-5xl font-bold text-green-600 mb-2">{analytics.overview.averageGrade}%</div>
                <div className="h-3 bg-green-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min(parseFloat(analytics.overview.averageGrade), 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-3">School-wide average performance</p>
              </CardContent>
            </div>
          </Card>

          <Card className="border-2 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <span>Attendance Rate</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-5xl font-bold text-blue-600 mb-2">{analytics.overview.attendanceRate}%</div>
                <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(parseFloat(analytics.overview.attendanceRate), 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-3">Overall attendance percentage</p>
              </CardContent>
            </div>
          </Card>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4">Class-Wise Statistics</h3>
        </div>

        <div className="grid gap-6">
          {analytics.classStats.map((stat, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle>{stat.className} (Level {stat.level})</CardTitle>
                <CardDescription>Performance metrics for {stat.className}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Sections</p>
                    <p className="text-2xl font-bold">{stat.sections}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-2xl font-bold">{stat.students}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Grade</p>
                    <p className="text-2xl font-bold text-green-600">{stat.averageGrade}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {analytics.classStats.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No class statistics available.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
