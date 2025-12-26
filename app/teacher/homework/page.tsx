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
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Plus, BookOpen, Loader2, Sparkles } from "lucide-react";

interface Homework {
  _id: string;
  title: string;
  description: string;
  subject: {
    name: string;
  };
  class: {
    name: string;
  };
  section: {
    name: string;
  };
  dueDate: string;
}

interface ClassData {
  _id: string;
  name: string;
  level: number;
  subjects: Array<{
    _id: string;
    name: string;
    code: string;
  }>;
  sections: Array<{
    _id: string;
    name: string;
  }>;
}

export default function TeacherHomeworkPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    details: "",
    classId: "",
    subjectId: "",
    sectionId: "",
    dueDate: new Date().toISOString().split("T")[0],
    title: "",
    description: "",
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
      fetchClassesAndSubjects();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/homework");
      if (res.ok) {
        const data = await res.json();
        setHomework(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch homework",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesAndSubjects = async () => {
    try {
      const res = await fetch("/api/teacher/classes-subjects");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch classes and subjects",
        variant: "destructive",
      });
    }
  };

  const selectedClass = classes.find((c) => c._id === formData.classId);
  const selectedSubject = selectedClass?.subjects.find((s) => s._id === formData.subjectId);

  const handleClassChange = (classId: string) => {
    const cls = classes.find((c) => c._id === classId);
    setFormData({
      ...formData,
      classId,
      subjectId: "",
      sectionId: "",
    });
  };

  const handleGenerateHomework = async () => {
    if (!formData.topic || !formData.details || !formData.classId || !formData.subjectId) {
      toast({
        title: "Error",
        description: "Please fill in topic, details, class, and subject",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/homework/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.topic,
          details: formData.details,
          subjectName: selectedSubject?.name || "",
          className: selectedClass?.name || "",
          classLevel: selectedClass?.level || 9,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({
          ...formData,
          title: data.title || `Homework: ${formData.topic}`,
          description: data.description || "",
        });
        toast({
          title: "Success",
          description: "Homework generated successfully using AI",
        });
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to generate homework",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate homework",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: "Error",
        description: "Please generate homework first or fill in title and description",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          subject: formData.subjectId,
          class: formData.classId,
          section: formData.sectionId || undefined,
          dueDate: formData.dueDate,
          aiGenerated: true,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Homework assigned successfully",
        });
        setShowDialog(false);
        setFormData({
          topic: "",
          details: "",
          classId: "",
          subjectId: "",
          sectionId: "",
          dueDate: new Date().toISOString().split("T")[0],
          title: "",
          description: "",
        });
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to assign homework",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign homework",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-slide-up">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Daily Homework</h2>
          <p className="text-gray-600">Assign homework based on topics covered today</p>
        </div>
        <div className="flex justify-end mb-8">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Daily Homework
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Daily Homework</DialogTitle>
                <DialogDescription>
                  Enter the topic covered today and let AI generate homework according to Punjab Board curriculum
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="classId">Class *</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={handleClassChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {cls.name} (Level {cls.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClass && (
                  <>
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
                            <SelectItem key={subject._id} value={subject._id}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sectionId">Section (Optional)</Label>
                      <Select
                        value={formData.sectionId || "__all__"}
                        onValueChange={(value) => setFormData({ ...formData, sectionId: value === "__all__" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Sections</SelectItem>
                          {selectedClass.sections.map((section) => (
                            <SelectItem key={section._id} value={section._id}>
                              Section {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic Covered Today *</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Photosynthesis, Quadratic Equations, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Details / Points Covered *</Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    placeholder="Describe the key points, concepts, or topics covered in today's class..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleGenerateHomework}
                    disabled={generating || !formData.topic || !formData.details || !formData.classId || !formData.subjectId}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>

                {formData.title && (
                  <>
                    <div className="border-t pt-4 space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800 font-medium mb-2">✓ Homework Generated Successfully!</p>
                        <p className="text-xs text-blue-700">Review and edit the generated homework questions below before saving.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">Homework Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Homework Questions *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={12}
                          className="font-mono text-sm"
                          placeholder="Homework questions will appear here..."
                          required
                        />
                        <p className="text-xs text-gray-500">The homework contains specific questions that students need to answer. You can edit the questions if needed.</p>
                      </div>
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowDialog(false);
                      setFormData({
                        topic: "",
                        details: "",
                        classId: "",
                        subjectId: "",
                        sectionId: "",
                        dueDate: new Date().toISOString().split("T")[0],
                        title: "",
                        description: "",
                      });
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !formData.title || !formData.description}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Homework"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {homework.length > 0 ? (
            homework.map((hw) => (
              <Card key={hw._id}>
                <CardHeader>
                  <CardTitle>{hw.title}</CardTitle>
                  <CardDescription>
                    {hw.subject?.name} - {hw.class?.name} {hw.section?.name || "All Sections"} | Due: {new Date(hw.dueDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {hw.description}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Homework Assigned</h3>
                <p className="text-gray-500">Start by adding daily homework for your students</p>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
