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
import { useToast } from "@/components/ui/use-toast";
import { FileText, Upload, Download, Loader2, Plus, Sparkles, X } from "lucide-react";

interface Paper {
  _id: string;
  title: string;
  subject: {
    name: string;
    code: string;
  };
  class: {
    name: string;
    level: number;
  };
  createdAt: string;
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
}

export default function TeacherPaperGeneratorPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    classId: "",
    subjectId: "",
    syllabusInfo: "",
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
      fetchPapers();
      fetchClassesAndSubjects();
    }
  }, [status]);

  const fetchPapers = async () => {
    try {
      const res = await fetch("/api/papers");
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
      }
    } catch (error) {
      console.error("Error fetching papers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesAndSubjects = async () => {
    try {
      const res = await fetch("/api/teacher/classes-subjects");
      if (res.ok) {
        const data = await res.json();
        // API returns { classes: [...] } or just the array
        const classesData = data.classes || (Array.isArray(data) ? data : []);
        setClasses(Array.isArray(classesData) ? classesData : []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClasses([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF, Word document, or text file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.classId || !formData.subjectId || !formData.syllabusInfo) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("classId", formData.classId);
      submitFormData.append("subjectId", formData.subjectId);
      submitFormData.append("syllabusInfo", formData.syllabusInfo);
      if (selectedFile) {
        submitFormData.append("sampleFile", selectedFile);
      }

      const res = await fetch("/api/papers", {
        method: "POST",
        body: submitFormData,
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Success",
          description: "Paper generated successfully!",
        });
        setShowDialog(false);
        setFormData({
          title: "",
          classId: "",
          subjectId: "",
          syllabusInfo: "",
        });
        setSelectedFile(null);
        fetchPapers();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to generate paper",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate paper",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (paperId: string, title: string) => {
    try {
      const res = await fetch(`/api/papers/${paperId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Success",
          description: "Paper downloaded successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to download paper",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download paper",
        variant: "destructive",
      });
    }
  };

  const selectedClass = Array.isArray(classes) ? classes.find((c) => c._id === formData.classId) : undefined;

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
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Paper Generator</h2>
              <p className="text-sm sm:text-base text-gray-600">Generate Punjab Board 2025 curriculum exam papers using AI. Upload a sample to replicate its exact format and design.</p>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Paper
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>Generate New Paper</DialogTitle>
                  <DialogDescription>
                    Upload a sample paper (PDF/DOCX) to analyze its format, then provide Punjab Board 2025 syllabus information to generate a new exam paper following the same design
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Paper Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Mid-Term Exam 2024"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="class">Class *</Label>
                    <Select
                      value={formData.classId}
                      onValueChange={(value) => setFormData({ ...formData, classId: value, subjectId: "" })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(classes) && classes.length > 0 ? (
                          classes.map((classItem) => (
                            <SelectItem key={classItem._id} value={classItem._id}>
                              {classItem.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-classes" disabled>No classes available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedClass && (
                    <div>
                      <Label htmlFor="subject">Subject *</Label>
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
                  )}

                  <div>
                    <Label htmlFor="sampleFile">Sample Paper (Optional)</Label>
                    <div className="mt-2">
                      <Input
                        id="sampleFile"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                      {selectedFile && (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800 flex-1">{selectedFile.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a sample paper (PDF, DOCX, or TXT) to analyze its format. AI will deeply analyze the design, structure, title format, subtitle style, subject header, question numbering, marking scheme, and overall layout, then replicate it exactly in the generated paper.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="syllabusInfo">Syllabus Information *</Label>
                    <Textarea
                      id="syllabusInfo"
                      value={formData.syllabusInfo}
                      onChange={(e) => setFormData({ ...formData, syllabusInfo: e.target.value })}
                      placeholder="Enter syllabus topics, chapters, or content areas to cover in the paper..."
                      rows={6}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter syllabus information according to Punjab Board 2025 curriculum (e.g., &quot;First 4 chapters&quot;, &quot;Chapter 1-3&quot;, &quot;Units 1-5&quot;). The AI will generate questions based on Punjab Board 2025 curriculum standards.
                    </p>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDialog(false);
                        setFormData({
                          title: "",
                          classId: "",
                          subjectId: "",
                          syllabusInfo: "",
                        });
                        setSelectedFile(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={generating}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Paper
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {papers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Papers Generated Yet</h3>
                <p className="text-gray-500 mb-6">
                  Start by generating your first exam paper using AI
                </p>
                <Button
                  onClick={() => setShowDialog(true)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Paper
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {papers.map((paper) => (
                <Card key={paper._id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    <CardTitle className="text-lg">{paper.title}</CardTitle>
                    <CardDescription className="text-indigo-100">
                      {paper.subject.name} • {paper.class.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p>Subject: <span className="font-semibold">{paper.subject.name}</span></p>
                        <p>Class: <span className="font-semibold">{paper.class.name}</span></p>
                        <p className="text-xs text-gray-500 mt-2">
                          Generated: {new Date(paper.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDownload(paper._id, paper.title)}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Paper
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
