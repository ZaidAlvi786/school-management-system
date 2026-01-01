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
import { FileText, Upload, Download, Loader2, Plus, Sparkles, X, BookOpen, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [syllabusTopics, setSyllabusTopics] = useState<any[]>([]);
  const [selectedSyllabusTopics, setSelectedSyllabusTopics] = useState<string[]>([]);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [savedFormats, setSavedFormats] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    classId: "",
    subjectId: "",
    syllabusInfo: "",
    term: "all" as 'all' | 'term1' | 'term2' | 'term3' | 'final',
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
        console.log("Fetched classes:", classesData);
        setClasses(Array.isArray(classesData) ? classesData : []);
      } else {
        const errorData = await res.json();
        console.error("Error response:", errorData);
        toast({
          title: "Error",
          description: errorData.error || "Failed to fetch classes",
          variant: "destructive",
        });
        setClasses([]);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch classes. Please try again.",
        variant: "destructive",
      });
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
        description: "Please fill in all required fields and select at least one syllabus topic",
        variant: "destructive",
      });
      return;
    }

    if (selectedSyllabusTopics.length === 0) {
      toast({
        title: "No Topics Selected",
        description: "Please select at least one syllabus topic to include in the paper",
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
      submitFormData.append("selectedSyllabusTopicIds", JSON.stringify(selectedSyllabusTopics));
      if (selectedFile) {
        submitFormData.append("sampleFile", selectedFile);
      }
      if (selectedFormat) {
        submitFormData.append("savedFormatId", selectedFormat);
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
          term: "all",
        });
        setSelectedFile(null);
        setSelectedSyllabusTopics([]);
        setSelectedFormat(null);
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

  const fetchSyllabus = async () => {
    if (!formData.subjectId || !formData.classId) {
      setSyllabusTopics([]);
      setSelectedSyllabusTopics([]);
      return;
    }

    setLoadingSyllabus(true);
    try {
      const response = await fetch(
        `/api/teacher/paper/syllabus?subjectId=${formData.subjectId}&classId=${formData.classId}&term=${formData.term}`
      );
      if (response.ok) {
        const data = await response.json();
        setSyllabusTopics(data.syllabus || []);
        // Auto-select all topics by default
        const allIds = (data.syllabus || []).map((item: any) => item.id);
        setSelectedSyllabusTopics(allIds);
      }
    } catch (error) {
      console.error("Failed to fetch syllabus:", error);
    } finally {
      setLoadingSyllabus(false);
    }
  };

  const fetchSavedFormats = async () => {
    if (!formData.subjectId || !formData.classId) return;

    try {
      const response = await fetch(
        `/api/teacher/paper/saved-formats?subjectId=${formData.subjectId}&classId=${formData.classId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSavedFormats(data.formats || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved formats:", error);
    }
  };

  useEffect(() => {
    if (formData.subjectId && formData.classId) {
      fetchSyllabus();
      fetchSavedFormats();
    }
  }, [formData.subjectId, formData.classId, formData.term]);

  // Update syllabus info when topics are selected
  useEffect(() => {
    if (selectedSyllabusTopics.length > 0) {
      const selectedTopics = syllabusTopics
        .filter((topic) => selectedSyllabusTopics.includes(topic.id))
        .map((topic) => topic.topic)
        .join(", ");
      setFormData((prev) => ({ ...prev, syllabusInfo: selectedTopics }));
    }
  }, [selectedSyllabusTopics, syllabusTopics]);

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
                        onValueChange={(value) => {
                          setFormData({ ...formData, subjectId: value, syllabusInfo: "" });
                          setSelectedSyllabusTopics([]);
                        }}
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

                  {formData.subjectId && formData.classId && (
                    <>
                      <div>
                        <Label htmlFor="term">Filter Syllabus by Term</Label>
                        <Select
                          value={formData.term}
                          onValueChange={(value: any) => {
                            setFormData({ ...formData, term: value });
                            setSelectedSyllabusTopics([]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Terms</SelectItem>
                            <SelectItem value="term1">Term 1</SelectItem>
                            <SelectItem value="term2">Term 2</SelectItem>
                            <SelectItem value="term3">Term 3</SelectItem>
                            <SelectItem value="final">Final Term</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Syllabus Topics Selection */}
                      {loadingSyllabus ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                          <span className="ml-2 text-sm text-gray-600">Loading syllabus...</span>
                        </div>
                      ) : syllabusTopics.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Syllabus Topics *</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (selectedSyllabusTopics.length === syllabusTopics.length) {
                                  setSelectedSyllabusTopics([]);
                                } else {
                                  setSelectedSyllabusTopics(syllabusTopics.map((t: any) => t.id));
                                }
                              }}
                              className="text-xs"
                            >
                              {selectedSyllabusTopics.length === syllabusTopics.length ? "Deselect All" : "Select All"}
                            </Button>
                          </div>
                          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                            {syllabusTopics.map((topic: any) => (
                              <div
                                key={topic.id}
                                className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition-colors"
                              >
                                <Checkbox
                                  id={`topic-${topic.id}`}
                                  checked={selectedSyllabusTopics.includes(topic.id)}
                                  onCheckedChange={(checked: boolean) => {
                                    if (checked) {
                                      setSelectedSyllabusTopics([...selectedSyllabusTopics, topic.id]);
                                    } else {
                                      setSelectedSyllabusTopics(selectedSyllabusTopics.filter((id) => id !== topic.id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`topic-${topic.id}`}
                                  className="flex-1 cursor-pointer text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{topic.topic}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {topic.term === 'final' ? 'Final' : topic.term.toUpperCase().replace('TERM', 'Term ')}
                                    </Badge>
                                    {topic.is_completed && (
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    )}
                                  </div>
                                  {topic.description && (
                                    <p className="text-xs text-gray-500 mt-1">{topic.description}</p>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            Selected {selectedSyllabusTopics.length} of {syllabusTopics.length} topics
                          </p>
                        </div>
                      ) : formData.subjectId && formData.classId ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            No syllabus topics found for this subject and class. Please add syllabus topics first.
                          </p>
                        </div>
                      ) : null}

                      {/* Saved Paper Formats */}
                      {savedFormats.length > 0 && (
                        <div>
                          <Label>Use Saved Paper Format (Optional)</Label>
                          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                            {savedFormats.map((format) => (
                              <div
                                key={format.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedFormat === format.id
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => {
                                  if (selectedFormat === format.id) {
                                    setSelectedFormat(null);
                                    setSelectedFile(null);
                                  } else {
                                    setSelectedFormat(format.id);
                                    // Note: We'll use the format's sample_paper_url in the API
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-indigo-500" />
                                  <span className="text-sm font-medium">{format.title}</span>
                                  {selectedFormat === format.id && (
                                    <CheckCircle2 className="h-4 w-4 text-indigo-500 ml-auto" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {format.subject?.name} • {format.class?.name}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Select a previously saved paper format to replicate its structure
                          </p>
                        </div>
                      )}
                    </>
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
                        disabled={!!selectedFormat}
                      />
                      {selectedFile && !selectedFormat && (
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
                      {selectedFormat && (
                        <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded">
                          <p className="text-sm text-indigo-800">
                            Using saved format from previous paper
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a sample paper (PDF, DOCX, or TXT) to analyze its format, or select a saved format above. AI will analyze the design, structure, title format, subtitle style, subject header, question numbering, marking scheme, and overall layout, then replicate it exactly.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="syllabusInfo">Syllabus Information *</Label>
                    <Textarea
                      id="syllabusInfo"
                      value={formData.syllabusInfo}
                      onChange={(e) => setFormData({ ...formData, syllabusInfo: e.target.value })}
                      placeholder="Syllabus topics will be auto-filled from selected topics above, or enter manually..."
                      rows={4}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Syllabus topics are automatically selected from your syllabus. You can modify this text if needed. The AI will generate questions based on these topics following Punjab Board 2025 curriculum standards.
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
                          term: "all",
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
