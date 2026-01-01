"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, BookOpen, CheckCircle2, Circle, Clock, Calendar, 
  Sparkles, TrendingUp, Target, Edit2, Trash2, X, 
  BookMarked, GraduationCap
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

interface ClassData {
  class: {
    id: string;
    name: string;
    level: number;
  };
  subjects: Array<{
    id: string;
    name: string;
    code?: string;
  }>;
}

const TERM_COLORS = {
  term1: { bg: 'from-blue-500 to-cyan-500', text: 'text-blue-600', border: 'border-blue-200' },
  term2: { bg: 'from-purple-500 to-pink-500', text: 'text-purple-600', border: 'border-purple-200' },
  term3: { bg: 'from-orange-500 to-red-500', text: 'text-orange-600', border: 'border-orange-200' },
  final: { bg: 'from-green-500 to-emerald-500', text: 'text-green-600', border: 'border-green-200' },
};

export default function TeacherSyllabusPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SyllabusItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<'all' | 'term1' | 'term2' | 'term3' | 'final'>('all');
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    subjectId: "",
    classId: "",
    term: "term1" as 'term1' | 'term2' | 'term3' | 'final',
    targetCompletionDate: "",
    notes: "",
  });

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
      fetchData();
      fetchSubjectsAndClasses();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/teacher/syllabus");
      if (response.ok) {
        const data = await response.json();
        setSyllabus(data.syllabus || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch syllabus",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndClasses = async () => {
    try {
      const response = await fetch("/api/teacher/syllabus/subjects-classes");
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("Failed to fetch subjects and classes:", error);
    }
  };

  const selectedClass = classes.find((c) => c.class.id === formData.classId);
  const selectedSubject = selectedClass?.subjects.find((s) => s.id === formData.subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingItem 
        ? `/api/teacher/syllabus/${editingItem.id}`
        : "/api/teacher/syllabus";
      
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          description: formData.description,
          subjectId: formData.subjectId,
          classId: formData.classId,
          term: formData.term,
          targetCompletionDate: formData.targetCompletionDate || null,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingItem ? "Syllabus updated successfully" : "Syllabus added successfully",
        });
        setShowDialog(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save syllabus",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save syllabus",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: SyllabusItem) => {
    setEditingItem(item);
    setFormData({
      topic: item.topic,
      description: item.description || "",
      subjectId: item.subject.id,
      classId: item.class.id,
      term: item.term,
      targetCompletionDate: item.target_completion_date ? item.target_completion_date.split('T')[0] : "",
      notes: item.notes || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this syllabus item?")) return;

    try {
      const response = await fetch(`/api/teacher/syllabus/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Syllabus deleted successfully",
        });
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete syllabus",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete syllabus",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (item: SyllabusItem) => {
    try {
      const response = await fetch(`/api/teacher/syllabus/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_completed: !item.is_completed,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: item.is_completed ? "Marked as incomplete" : "Marked as completed",
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      topic: "",
      description: "",
      subjectId: "",
      classId: "",
      term: "term1",
      targetCompletionDate: "",
      notes: "",
    });
    setEditingItem(null);
  };

  const filteredSyllabus = selectedTerm === 'all' 
    ? syllabus 
    : syllabus.filter(item => item.term === selectedTerm);

  // Group by subject and class
  const groupedSyllabus = filteredSyllabus.reduce((acc: any, item) => {
    const key = `${item.subject.id}-${item.class.id}`;
    if (!acc[key]) {
      acc[key] = {
        subject: item.subject,
        class: item.class,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

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

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                    Syllabus Management
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm md:text-base">Manage term-based syllabus for your subjects</p>
                </div>
              </div>
              <Dialog open={showDialog} onOpenChange={(open) => {
                setShowDialog(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Syllabus Topic
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit Syllabus Topic" : "Add Syllabus Topic"}</DialogTitle>
                    <DialogDescription>
                      Add syllabus topics organized by terms (Term 1, Term 2, Term 3, Final)
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="classId">Class *</Label>
                        <Select
                          value={formData.classId}
                          onValueChange={(value) => setFormData({ ...formData, classId: value, subjectId: "" })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.class.id} value={cls.class.id}>
                                {cls.class.name} (Level {cls.class.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedClass && (
                        <div className="space-y-2">
                          <Label htmlFor="subjectId">Subject *</Label>
                          <Select
                            value={formData.subjectId}
                            onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedClass.subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name} {subject.code && `(${subject.code})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="term">Term *</Label>
                      <Select
                        value={formData.term}
                        onValueChange={(value: any) => setFormData({ ...formData, term: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="term1">Term 1</SelectItem>
                          <SelectItem value="term2">Term 2</SelectItem>
                          <SelectItem value="term3">Term 3</SelectItem>
                          <SelectItem value="final">Final Term</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic *</Label>
                      <Input
                        id="topic"
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        placeholder="e.g., Introduction to Algebra"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detailed description of the topic..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetCompletionDate">Target Completion Date</Label>
                      <Input
                        id="targetCompletionDate"
                        type="date"
                        value={formData.targetCompletionDate}
                        onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => {
                        setShowDialog(false);
                        resetForm();
                      }} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Saving..." : editingItem ? "Update" : "Add Topic"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Term Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
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
          <div className="mb-6 sm:mb-8">
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
            <div className="space-y-6 sm:space-y-8">
              {Object.values(groupedSyllabus).map((group: any, groupIndex: number) => {
                const completionPercentage = group.items.length > 0
                  ? (group.items.filter((item: SyllabusItem) => item.is_completed).length / group.items.length) * 100
                  : 0;

                return (
                  <Card
                    key={`${group.subject.id}-${group.class.id}`}
                    className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                    style={{ animationDelay: `${groupIndex * 0.1}s` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <CardHeader className="relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                            <GraduationCap className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                              {group.subject.name} - {group.class.name}
                            </CardTitle>
                            <CardDescription className="text-sm sm:text-base">
                              {group.items.length} topics • {completionPercentage.toFixed(0)}% Complete
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
                          const colors = TERM_COLORS[item.term];
                          const isOverdue = item.target_completion_date && 
                            new Date(item.target_completion_date) < new Date() && 
                            !item.is_completed;

                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg group/item ${
                                item.is_completed 
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                                  : isOverdue
                                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                                  : 'bg-white border-gray-200 hover:border-indigo-300'
                              }`}
                              style={{ animationDelay: `${itemIndex * 0.05}s` }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <button
                                      onClick={() => handleToggleComplete(item)}
                                      className="flex-shrink-0 mt-1"
                                    >
                                      {item.is_completed ? (
                                        <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full shadow-lg hover:scale-110 transition-transform">
                                          <CheckCircle2 className="h-5 w-5 text-white" />
                                        </div>
                                      ) : (
                                        <div className="p-1.5 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                                          <Circle className="h-5 w-5 text-gray-400" />
                                        </div>
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-base sm:text-lg text-gray-900 mb-1">
                                        {item.topic}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge className={`bg-gradient-to-r ${colors.bg} text-white border-0 text-xs`}>
                                          {item.term === 'final' ? 'Final' : item.term.toUpperCase().replace('TERM', 'Term ')}
                                        </Badge>
                                        {item.is_completed && (
                                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                            Completed
                                          </Badge>
                                        )}
                                        {isOverdue && (
                                          <Badge variant="destructive">Overdue</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mb-3 ml-11">{item.description}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 ml-11 text-xs sm:text-sm text-gray-500">
                                    {item.target_completion_date && (
                                      <span className="flex items-center gap-1">
                                        <Target className="h-4 w-4" />
                                        Target: {new Date(item.target_completion_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {item.completion_date && (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Completed: {new Date(item.completion_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(item)}
                                    className="hover:bg-indigo-100"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(item.id)}
                                    className="hover:bg-red-100 text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
            <Card className="border-2 animate-slide-up">
              <CardContent className="py-12 sm:py-16 text-center">
                <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                  <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Syllabus Topics</h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">Start by adding syllabus topics for your subjects</p>
                <Button
                  onClick={() => setShowDialog(true)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Topic
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
