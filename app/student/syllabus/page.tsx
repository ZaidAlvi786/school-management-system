"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { 
  BookOpen, CheckCircle2, Circle, TrendingUp, Sparkles, 
  Target, Calendar, Clock, BookMarked, GraduationCap,
  Award, AlertCircle
} from "lucide-react";

interface SyllabusItem {
  id: string;
  topic: string;
  description?: string;
  term: 'term1' | 'term2' | 'term3' | 'final';
  status: 'pending' | 'in-progress' | 'completed';
  is_completed: boolean;
  start_date?: string;
  completion_date?: string;
  target_completion_date?: string;
  notes?: string;
  materials?: string[];
  subject: {
    id: string;
    name: string;
    code?: string;
  };
  class: {
    id: string;
    name: string;
    level: number;
  };
}

type TermType = 'term1' | 'term2' | 'term3' | 'final';

const TERM_COLORS: Record<TermType, { bg: string; text: string; border: string; light: string }> = {
  term1: { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-600', border: 'border-blue-200', light: 'from-blue-50 to-cyan-50' },
  term2: { bg: 'from-purple-500 to-pink-500', text: 'text-purple-600', border: 'border-purple-200', light: 'from-purple-50 to-pink-50' },
  term3: { bg: 'from-orange-500 to-red-500', text: 'text-orange-600', border: 'border-orange-200', light: 'from-orange-50 to-red-50' },
  final: { bg: 'from-green-500 to-emerald-500', text: 'text-green-600', border: 'border-green-200', light: 'from-green-50 to-emerald-50' },
};

export default function StudentSyllabusPage() {
  const { data: session, status } = useSession();
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<'all' | 'term1' | 'term2' | 'term3' | 'final'>('all');

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
        setSyllabus(data || []);
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

  const filteredSyllabus = selectedTerm === 'all' 
    ? syllabus 
    : syllabus.filter(item => item.term === selectedTerm);

  // Group by subject and term
  const groupedSyllabus = filteredSyllabus.reduce((acc: any, item: SyllabusItem) => {
    const key = `${item.subject.id}-${item.term}`;
    if (!acc[key]) {
      acc[key] = {
        subject: item.subject,
        class: item.class,
        term: item.term,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const getCompletionPercentage = (items: SyllabusItem[]) => {
    if (items.length === 0) return 0;
    const completed = items.filter(item => item.is_completed).length;
    return (completed / items.length) * 100;
  };

  const getTermStats = () => {
    const stats = {
      term1: { total: 0, completed: 0 },
      term2: { total: 0, completed: 0 },
      term3: { total: 0, completed: 0 },
      final: { total: 0, completed: 0 },
    };

    syllabus.forEach(item => {
      stats[item.term].total++;
      if (item.is_completed) stats[item.term].completed++;
    });

    return stats;
  };

  const stats = getTermStats();
  const overallCompletion = syllabus.length > 0
    ? (syllabus.filter(item => item.is_completed).length / syllabus.length) * 100
    : 0;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
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
                <p className="text-gray-600 mt-1 text-sm md:text-base">Track your syllabus completion journey by terms</p>
              </div>
              <div className="hidden sm:block">
                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Overall Progress Card */}
          <Card className="mb-6 md:mb-8 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 hover:shadow-2xl transition-all duration-500 animate-slide-up">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Overall Progress</h3>
                    <p className="text-sm text-gray-600">{syllabus.filter(item => item.is_completed).length} of {syllabus.length} topics completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-right">
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {overallCompletion.toFixed(0)}%
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Complete</p>
                  </div>
                  <Progress value={overallCompletion} className="w-32 sm:w-40 h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Term Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
            {(['term1', 'term2', 'term3', 'final'] as const).map((term, index) => {
              const termData = stats[term];
              const percentage = termData.total > 0 ? (termData.completed / termData.total) * 100 : 0;
              const colors = TERM_COLORS[term];
              
              return (
                <Card 
                  key={term}
                  className={`border-2 ${colors.border} hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.02] overflow-hidden group relative`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <CardContent className="p-4 sm:p-6 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 bg-gradient-to-br ${colors.bg} rounded-lg shadow-lg`}>
                        <BookMarked className="h-5 w-5 text-white" />
                      </div>
                      <Badge className={`bg-gradient-to-r ${colors.bg} text-white border-0`}>
                        {term === 'final' ? 'Final' : term.toUpperCase().replace('TERM', 'Term ')}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completed</span>
                        <span className={`text-2xl font-bold ${colors.text}`}>
                          {termData.completed}/{termData.total}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-gray-500">{percentage.toFixed(0)}% Complete</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Term Filter */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTerm === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedTerm('all')}
                className={selectedTerm === 'all' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : ''}
              >
                All Terms
              </Button>
              {(['term1', 'term2', 'term3', 'final'] as const).map((term) => {
                const colors = TERM_COLORS[term];
                return (
                  <Button
                    key={term}
                    variant={selectedTerm === term ? 'default' : 'outline'}
                    onClick={() => setSelectedTerm(term)}
                    className={selectedTerm === term ? `bg-gradient-to-r ${colors.bg} text-white` : ''}
                  >
                    {term === 'final' ? 'Final' : term.toUpperCase().replace('TERM', 'Term ')}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Syllabus List */}
          {Object.keys(groupedSyllabus).length > 0 ? (
            <div className="space-y-6 md:space-y-8">
              {Object.values(groupedSyllabus).map((group: any, groupIndex: number) => {
                const completionPercentage = getCompletionPercentage(group.items);
                const term = group.term as TermType;
                const colors = TERM_COLORS[term] || TERM_COLORS.term1;

                return (
                  <Card
                    key={`${group.subject.id}-${group.term}`}
                    className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                    style={{ animationDelay: `${groupIndex * 0.1}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${colors.light} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                    
                    <CardHeader className="relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 bg-gradient-to-br ${colors.bg} rounded-xl shadow-lg`}>
                            <GraduationCap className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                              {group.subject.name} - {group.class.name}
                            </CardTitle>
                            <CardDescription className="text-sm sm:text-base flex items-center gap-2">
                              <Badge className={`bg-gradient-to-r ${colors.bg} text-white border-0`}>
                                {group.term === 'final' ? 'Final' : group.term.toUpperCase().replace('TERM', 'Term ')}
                              </Badge>
                              <span>•</span>
                              <span>{group.items.length} topics • {completionPercentage.toFixed(0)}% Complete</span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={completionPercentage} className="w-24 sm:w-32 h-2" />
                          <span className="text-sm font-semibold text-gray-700">{completionPercentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative z-10">
                      <div className="space-y-3 sm:space-y-4">
                        {group.items.map((item: SyllabusItem, itemIndex: number) => {
                          const isOverdue = item.target_completion_date && 
                            new Date(item.target_completion_date) < new Date() && 
                            !item.is_completed;

                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg group/item ${
                                item.is_completed 
                                  ? `bg-gradient-to-r ${TERM_COLORS[item.term as TermType]?.light || TERM_COLORS.term1.light} border-green-200` 
                                  : isOverdue
                                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                                  : 'bg-white border-gray-200 hover:border-indigo-300'
                              }`}
                              style={{ animationDelay: `${itemIndex * 0.05}s` }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="pt-1 flex-shrink-0">
                                  {item.is_completed ? (
                                    <div className={`p-1.5 bg-gradient-to-br ${TERM_COLORS[item.term as TermType]?.bg || TERM_COLORS.term1.bg} rounded-full shadow-lg group-hover/item:scale-110 transition-transform duration-300`}>
                                      <CheckCircle2 className="h-5 w-5 text-white" />
                                    </div>
                                  ) : (
                                    <div className="p-1.5 bg-gray-200 rounded-full group-hover/item:bg-gray-300 transition-colors">
                                      <Circle className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base sm:text-lg text-gray-900 mb-2 group-hover/item:text-indigo-600 transition-colors">
                                    {item.topic}
                                  </h4>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    {item.is_completed ? (
                                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                        Completed
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-2">
                                        Pending
                                      </Badge>
                                    )}
                                    {isOverdue && (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Overdue
                                      </Badge>
                                    )}
                                    {item.target_completion_date && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Target className="h-3 w-3" />
                                        Target: {new Date(item.target_completion_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {item.completion_date && (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Completed: {new Date(item.completion_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                  <p className="text-gray-600 text-sm md:text-base">Your syllabus will appear here once your teacher adds it</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
