"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { BookOpen, CheckCircle2, Circle, TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SyllabusItem {
  id: string;
  topic: string;
  description?: string;
  subject: {
    name: string;
    code?: string;
  };
  status?: string;
  completion_date?: string;
}

export default function StudentSyllabusPage() {
  const { data: session, status } = useSession();
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchSyllabus();
    }
  }, [status]);

  const fetchSyllabus = async () => {
    try {
      const response = await fetch("/api/student/syllabus");
      if (response.ok) {
        const data = await response.json();
        setSyllabus(data);
      }
    } catch (error) {
      console.error("Failed to fetch syllabus:", error);
    } finally {
      setLoading(false);
    }
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

  // Group by subject
  const groupedSyllabus = syllabus.reduce((acc: any, item: SyllabusItem) => {
    const subjectName = item.subject?.name || "Unknown";
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(item);
    return acc;
  }, {});

  const getCompletionPercentage = (items: SyllabusItem[]) => {
    if (items.length === 0) return 0;
    const completed = items.filter(item => item.status === "completed").length;
    return (completed / items.length) * 100;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header with animated gradient background */}
          <div className="mb-6 md:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  Syllabus Progress
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">Track your syllabus completion journey</p>
              </div>
              <div className="hidden sm:block">
                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {Object.keys(groupedSyllabus).length > 0 ? (
            <div className="grid gap-6 md:gap-8">
              {Object.entries(groupedSyllabus).map(([subjectName, items]: [string, any], index) => {
                const completionPercentage = getCompletionPercentage(items);
                const completedCount = items.filter((item: SyllabusItem) => item.status === "completed").length;
                
                return (
                  <Card
                    key={subjectName}
                    className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <CardHeader className="relative z-10">
                      <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-300"></div>
                      
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {subjectName}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-sm md:text-base ml-12">
                            {completedCount} of {items.length} topics completed
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="text-center md:text-right">
                            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-gradient">
                              {completionPercentage.toFixed(0)}%
                            </div>
                            <p className="text-xs md:text-sm text-gray-600 mt-1">Complete</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 md:mt-6 relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs md:text-sm text-gray-600">Progress</span>
                          <span className="text-xs md:text-sm font-medium text-gray-700">{completionPercentage.toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={completionPercentage}
                          className="h-2 md:h-3 bg-gray-200"
                          indicatorClassName="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-1000 ease-out"
                        />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="relative z-10">
                      <div className="grid gap-3 md:gap-4">
                        {items.map((item: SyllabusItem, itemIndex: number) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 group/item hover:shadow-md"
                            style={{ animationDelay: `${itemIndex * 0.03}s` }}
                          >
                            <div className="pt-1 flex-shrink-0">
                              {item.status === "completed" ? (
                                <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full shadow-lg group-hover/item:scale-110 transition-transform duration-300">
                                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                </div>
                              ) : (
                                <div className="p-1.5 bg-gray-200 rounded-full group-hover/item:bg-gray-300 transition-colors">
                                  <Circle className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-1 group-hover/item:text-indigo-600 transition-colors">
                                {item.topic || "Untitled Topic"}
                              </h4>
                              {item.description && (
                                <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                {item.status === "completed" ? (
                                  <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-md text-xs md:text-sm">
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-2 text-xs md:text-sm">
                                    Pending
                                  </Badge>
                                )}
                                {item.completion_date && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                    Completed on {new Date(item.completion_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-2 animate-slide-up hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardContent className="py-12 md:py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50"></div>
                <div className="relative z-10">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                    <BookOpen className="h-10 w-10 md:h-12 md:w-12 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Syllabus Available</h3>
                  <p className="text-gray-600 text-sm md:text-base">Your syllabus will appear here once it is available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

