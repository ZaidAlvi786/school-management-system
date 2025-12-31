"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { BookOpen, TrendingUp, Award, Calendar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Grade {
  id: string;
  subject: {
    name: string;
    code?: string;
  };
  exam_type: string;
  marks: number;
  total_marks: number;
  percentage: number;
  remarks?: string;
  date: string;
  teacher: {
    name: string;
  };
}

export default function StudentGradesPage() {
  const { data: session, status } = useSession();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averagePercentage: 0,
    totalExams: 0,
    highestGrade: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "student") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGrades();
    }
  }, [status]);

  const fetchGrades = async () => {
    try {
      const response = await fetch("/api/student/grades");
      if (response.ok) {
        const data = await response.json();
        setGrades(data);
        
        // Calculate stats
        if (data.length > 0) {
          const totalPercentage = data.reduce((sum: number, grade: Grade) => sum + grade.percentage, 0);
          const avgPercentage = totalPercentage / data.length;
          const highestGrade = Math.max(...data.map((g: Grade) => g.percentage));
          
          setStats({
            averagePercentage: avgPercentage,
            totalExams: data.length,
            highestGrade: highestGrade,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "from-emerald-500 to-green-500";
    if (percentage >= 80) return "from-blue-500 to-cyan-500";
    if (percentage >= 70) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    return "D";
  };

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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header with animated gradient background */}
          <div className="mb-6 md:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 md:p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  My Grades
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">Track your academic performance and excellence</p>
              </div>
              <div className="hidden sm:block">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards with enhanced animations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
                  {stats.averagePercentage.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                    {getGradeLabel(stats.averagePercentage)}
                  </Badge>
                  Grade
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer" style={{ animationDelay: "0.1s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <Award className="h-4 w-4 text-emerald-600" />
                  </div>
                  Highest Grade
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent animate-gradient">
                  {stats.highestGrade.toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500 mt-2">Best Performance</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer sm:col-span-2 lg:col-span-1" style={{ animationDelay: "0.2s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  Total Exams
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
                  {stats.totalExams}
                </div>
                <p className="text-sm text-gray-500 mt-2">Completed Assessments</p>
              </CardContent>
            </Card>
          </div>

          {/* Grades List with staggered animations */}
          {grades.length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {grades.map((grade, index) => (
                <Card
                  key={grade.id}
                  className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Animated gradient border */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${getGradeColor(grade.percentage)} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                  
                  <div className={`bg-gradient-to-r ${getGradeColor(grade.percentage)} p-[2px] group-hover:p-[3px] transition-all duration-300`}>
                    <CardContent className="bg-white p-4 md:p-6 relative">
                      {/* Decorative elements */}
                      <div className={`absolute top-4 right-4 w-24 h-24 bg-gradient-to-br ${getGradeColor(grade.percentage)} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-300`}></div>
                      
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 md:gap-4 mb-3">
                            <div className={`p-2 md:p-3 bg-gradient-to-br ${getGradeColor(grade.percentage)} rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                              <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {grade.subject?.name || "Unknown Subject"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                                <Badge variant="outline" className="text-xs md:text-sm border-2 hover:border-blue-500 transition-colors">
                                  {grade.exam_type}
                                </Badge>
                                <span className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                  by {grade.teacher?.name || "Unknown Teacher"}
                                </span>
                              </div>
                              <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2 mt-2">
                                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                                {new Date(grade.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                              {grade.remarks && (
                                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
                                  <p className="text-xs md:text-sm text-gray-700 italic">
                                    &quot;{grade.remarks}&quot;
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center md:justify-end">
                          <div className="text-center p-4 md:p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border-2 border-gray-100 group-hover:border-blue-200 transition-colors min-w-[120px]">
                            <div className={`text-3xl md:text-5xl font-bold bg-gradient-to-r ${getGradeColor(grade.percentage)} bg-clip-text text-transparent mb-2`}>
                              {grade.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs md:text-sm font-medium text-gray-600 mb-2">
                              {grade.marks} / {grade.total_marks}
                            </div>
                            <Badge className={`bg-gradient-to-r ${getGradeColor(grade.percentage)} text-white border-0 text-xs md:text-sm px-3 py-1 shadow-lg`}>
                              {getGradeLabel(grade.percentage)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 animate-slide-up hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardContent className="py-12 md:py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/50"></div>
                <div className="relative z-10">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                    <BookOpen className="h-10 w-10 md:h-12 md:w-12 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Grades Yet</h3>
                  <p className="text-gray-600 text-sm md:text-base">Your grades will appear here once they are recorded</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
