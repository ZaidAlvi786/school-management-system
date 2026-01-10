"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { FileText, Calendar, BookOpen, Clock, User, Sparkles, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Homework {
  id: string;
  title: string;
  description?: string;
  subject: {
    name: string;
    code?: string;
  };
  due_date: string;
  assigned_by: {
    name: string;
  };
  class: {
    name: string;
  };
  section: {
    name: string;
  };
  completion_status?: 'pending' | 'completed' | 'approved' | 'rejected';
  completed_at?: string;
  approved_at?: string;
}

export default function StudentHomeworkPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState<string | null>(null);

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
      fetchHomework();
    }
  }, [status]);

  const fetchHomework = async () => {
    try {
      const { getStudentHomework } = await import("@/lib/fastapi-client");
      const data = await getStudentHomework();
      setHomework(data);
    } catch (error: any) {
      console.error("Failed to fetch homework:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch homework",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleMarkAsDone = async (homeworkId: string) => {
    try {
      setMarkingDone(homeworkId);
      const { markHomeworkDone } = await import("@/lib/fastapi-client");
      await markHomeworkDone(homeworkId);
      
      toast({
        title: "Success",
        description: "Homework marked as done! Waiting for teacher approval.",
      });
      // Refresh homework list
      fetchHomework();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark homework as done",
        variant: "destructive",
      });
    } finally {
      setMarkingDone(null);
    }
  };

  const getStatusBadge = (homework: Homework) => {
    if (homework.completion_status === 'approved') {
      return (
        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (homework.completion_status === 'completed' || homework.completion_status === 'pending') {
      return (
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg">
          <Clock className="h-3 w-3 mr-1" />
          Pending Approval
        </Badge>
      );
    }
    if (homework.completion_status === 'rejected') {
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return null;
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

  const upcomingHomework = homework.filter(h => !isOverdue(h.due_date));
  const overdueHomework = homework.filter(h => isOverdue(h.due_date));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header with animated gradient background */}
          <div className="mb-6 md:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 md:p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">
                  My Homework
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">View and manage your assignments</p>
              </div>
              <div className="hidden sm:block">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Section */}
          {overdueHomework.length > 0 && (
            <div className="mb-6 md:mb-8 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Overdue ({overdueHomework.length})
                </h2>
              </div>
              <div className="grid gap-4 mb-6">
                {overdueHomework.map((item, index) => (
                  <Card
                    key={item.id}
                    className="border-2 border-red-200 bg-gradient-to-br from-red-50/50 to-pink-50/50 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Animated red gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <CardContent className="p-4 md:p-6 relative">
                      <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-red-500 to-pink-500 opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-300"></div>
                      
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 md:gap-4 mb-3">
                            <div className="p-2 md:p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                              <FileText className="h-5 w-5 md:h-6 md:w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                                {item.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                                <Badge variant="outline" className="flex items-center gap-1 border-2 hover:border-purple-500 transition-colors">
                                  <BookOpen className="h-3 w-3" />
                                  {item.subject?.name || "Unknown Subject"}
                                </Badge>
                                <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg">
                                  Overdue
                                </Badge>
                              </div>
                              {item.description && (
                                <p className="text-sm md:text-base text-gray-700 mb-3 bg-white/50 p-3 rounded-lg border border-red-100">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
                                <span className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-red-100">
                                  <Calendar className="h-4 w-4 text-red-500" />
                                  Due: {new Date(item.due_date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-red-100">
                                  <User className="h-4 w-4 text-red-500" />
                                  {item.assigned_by?.name || "Unknown Teacher"}
                                </span>
                              </div>
                              {(!item.completion_status || (item.completion_status !== 'approved' && item.completion_status !== 'completed' && item.completion_status !== 'pending')) && (
                                <div className="mt-4">
                                  <Button
                                    onClick={() => handleMarkAsDone(item.id)}
                                    disabled={markingDone === item.id}
                                    className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                  >
                                    {markingDone === item.id ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Marking...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Mark as Done
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                              {item.completion_status === 'completed' || item.completion_status === 'pending' ? (
                                <div className="mt-4">
                                  <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                                    ✓ Marked as done. Waiting for teacher approval.
                                  </p>
                                </div>
                              ) : null}
                              {item.completion_status === 'approved' && item.approved_at ? (
                                <div className="mt-4">
                                  <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                                    ✓ Approved on {new Date(item.approved_at).toLocaleDateString()}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                Upcoming ({upcomingHomework.length})
              </h2>
            </div>
            {upcomingHomework.length > 0 ? (
              <div className="grid gap-4 md:gap-6">
                {upcomingHomework.map((item, index) => {
                  const daysUntil = getDaysUntilDue(item.due_date);
                  const dueSoon = isDueSoon(item.due_date);
                  
                  return (
                    <Card
                      key={item.id}
                      className={`border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative ${
                        dueSoon ? "border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-orange-50/50" : "bg-white"
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* Animated gradient overlay */}
                      <div className={`absolute inset-0 ${dueSoon ? "bg-gradient-to-r from-yellow-500/5 to-orange-500/5" : "bg-gradient-to-r from-purple-500/5 to-pink-500/5"} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                      
                      <CardContent className="p-4 md:p-6 relative">
                        <div className={`absolute top-4 right-4 w-24 h-24 ${dueSoon ? "bg-gradient-to-br from-yellow-500 to-orange-500" : "bg-gradient-to-br from-purple-500 to-pink-500"} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-300`}></div>
                        
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 md:gap-4 mb-3">
                              <div className={`p-2 md:p-3 bg-gradient-to-br ${dueSoon ? "from-yellow-500 to-orange-500" : "from-purple-500 to-pink-500"} rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                <FileText className="h-5 w-5 md:h-6 md:w-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                                  {item.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                                  <Badge variant="outline" className="flex items-center gap-1 border-2 hover:border-purple-500 transition-colors">
                                    <BookOpen className="h-3 w-3" />
                                    {item.subject?.name || "Unknown Subject"}
                                  </Badge>
                                  {dueSoon && (
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg">
                                      Due Soon
                                    </Badge>
                                  )}
                                  {daysUntil === 0 && (
                                    <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg">
                                      Due Today
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm md:text-base text-gray-700 mb-3 bg-white/50 p-3 rounded-lg border border-gray-100">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
                                  <span className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    Due: {new Date(item.due_date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  <span className={`flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border ${dueSoon ? "border-yellow-200" : "border-gray-100"}`}>
                                    <Clock className={`h-4 w-4 ${dueSoon ? "text-yellow-500" : "text-blue-500"}`} />
                                    {daysUntil === 0
                                      ? "Due today"
                                      : daysUntil === 1
                                      ? "Due tomorrow"
                                      : `${daysUntil} days left`}
                                  </span>
                                  <span className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    <User className="h-4 w-4 text-purple-500" />
                                    {item.assigned_by?.name || "Unknown Teacher"}
                                  </span>
                                </div>
                                {(!item.completion_status || (item.completion_status !== 'approved' && item.completion_status !== 'completed' && item.completion_status !== 'pending')) && (
                                  <div className="mt-4">
                                    <Button
                                      onClick={() => handleMarkAsDone(item.id)}
                                      disabled={markingDone === item.id}
                                      className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                    >
                                      {markingDone === item.id ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Marking...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Mark as Done
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                                {item.completion_status === 'completed' || item.completion_status === 'pending' ? (
                                  <div className="mt-4">
                                    <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                                      ✓ Marked as done. Waiting for teacher approval.
                                    </p>
                                  </div>
                                ) : null}
                                {item.completion_status === 'approved' && item.approved_at ? (
                                  <div className="mt-4">
                                    <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                                      ✓ Approved on {new Date(item.approved_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-2 animate-slide-up hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                <CardContent className="py-12 md:py-16 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50"></div>
                  <div className="relative z-10">
                    <div className="p-4 md:p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                      <FileText className="h-10 w-10 md:h-12 md:w-12 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Homework</h3>
                    <p className="text-gray-600 text-sm md:text-base">You&apos;re all caught up! No pending assignments.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
