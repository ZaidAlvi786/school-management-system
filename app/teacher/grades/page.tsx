"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, BookOpen } from "lucide-react";

interface Grade {
  _id: string;
  student: {
    _id: string;
    rollNumber: string;
  };
  subject: {
    _id: string;
    name: string;
  };
  examType: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  remarks?: string;
  date: string;
}

interface Subject {
  _id: string;
  name: string;
  class: string;
}

interface Student {
  _id: string;
  rollNumber: string;
  user: {
    name: string;
    email: string;
  };
}

export default function TeacherGradesPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    student: "",
    subject: "",
    examType: "quiz",
    marks: "",
    totalMarks: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
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
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const { getGrades, getClassesSubjects } = await import("@/lib/fastapi-client");
      const [gradesData, classesData] = await Promise.all([
        getGrades(),
        getClassesSubjects(),
      ]);

      setGrades(gradesData);
      
      // Get subjects from classes data
      const teacherSubjects = classesData.subjects || [];
      setSubjects(teacherSubjects);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { createGrade } = await import("@/lib/fastapi-client");
      await createGrade({
        ...formData,
        marks: parseFloat(formData.marks),
        totalMarks: parseFloat(formData.totalMarks),
      });

      toast({
        title: "Success",
        description: "Grade added successfully",
      });
      setShowDialog(false);
      setFormData({
        student: "",
        subject: "",
        examType: "quiz",
        marks: "",
        totalMarks: "",
        remarks: "",
        date: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add grade",
        variant: "destructive",
      });
    }
  };

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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 animate-slide-up">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Student Grades</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage and record student grades</p>
        </div>
        <div className="flex justify-end mb-6 sm:mb-8">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Add Grade</DialogTitle>
                <DialogDescription>Record a new grade for a student</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student">Student</Label>
                  <Input
                    id="student"
                    value={formData.student}
                    onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                    placeholder="Student ID"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Subject ID"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="examType">Exam Type</Label>
                  <Select
                    value={formData.examType}
                    onValueChange={(value) => setFormData({ ...formData, examType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marks">Marks</Label>
                    <Input
                      id="marks"
                      type="number"
                      step="0.01"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalMarks">Total Marks</Label>
                    <Input
                      id="totalMarks"
                      type="number"
                      step="0.01"
                      value={formData.totalMarks}
                      onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Input
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Additional comments"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Grade</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {grades.length > 0 ? (
            grades.map((grade) => (
              <Card key={grade._id}>
                <CardHeader>
                  <CardTitle>
                    {grade.subject?.name || "Unknown Subject"} - {grade.examType}
                  </CardTitle>
                  <CardDescription>
                    Student: {grade.student?.rollNumber || "Unknown"} | Date: {new Date(grade.date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {grade.marks} / {grade.totalMarks}
                      </p>
                      <p className="text-sm text-gray-600">{grade.percentage.toFixed(2)}%</p>
                    </div>
                    {grade.remarks && (
                      <p className="text-sm text-gray-600">{grade.remarks}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Grades Yet</h3>
                <p className="text-gray-500">Start by adding grades for your students</p>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

