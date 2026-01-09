"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
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
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, BookOpen } from "lucide-react";

interface Teacher {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  employeeId: string;
  school: {
    name: string;
  };
  assignedSubjects: Array<{
    _id: string;
    name: string;
    code: string;
    class: {
      name: string;
      level: number;
    };
  }>;
}

interface Class {
  _id: string;
  name: string;
  level: number;
}

export default function TeachersPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: "",
    classId: "",
    subjectName: "",
    subjectCode: "",
  });

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
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const { getTeachers, getClasses } = await import("@/lib/fastapi-client");
      const [teachersData, classesData] = await Promise.all([
        getTeachers(),
        getClasses(),
      ]);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { assignSubject } = await import("@/lib/fastapi-client");
      await assignSubject(formData);
      toast({
        title: "Success",
        description: "Teacher assigned successfully",
      });
      setShowDialog(false);
      setFormData({
        teacherId: "",
        classId: "",
        subjectName: "",
        subjectCode: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign teacher",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" className="hover:bg-green-50">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Teacher Assignment
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Assign Teachers to Subjects</h2>
            <p className="text-gray-600">
              {session?.user?.role === "admin" 
                ? "View teacher assignments and subject allocations (Read-only)" 
                : "Manage teacher assignments and subject allocations"}
            </p>
          </div>
          {session?.user?.role !== "admin" && (
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assign Teacher
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Teacher to Subject</DialogTitle>
                <DialogDescription>Assign a teacher to teach a subject in a class</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAssign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherId">Teacher</Label>
                  <Select
                    value={formData.teacherId}
                    onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher._id} value={teacher._id}>
                          {teacher.user.name} ({teacher.user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classId">Class</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={(value) => setFormData({ ...formData, classId: value })}
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
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                    id="subjectName"
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    placeholder="Mathematics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectCode">Subject Code</Label>
                  <Input
                    id="subjectCode"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    placeholder="MATH-9"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Assign</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <div className="grid gap-6">
          {teachers.map((teacher) => (
            <Card key={teacher._id} className="overflow-hidden border-2 hover:border-green-300 transition-all duration-300 hover:shadow-xl">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6">
                <CardHeader className="p-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white">
                        {teacher.user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white text-2xl mb-1">{teacher.user.name}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                            {teacher.user.email}
                          </span>
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                            ID: {teacher.employeeId}
                          </span>
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                            {teacher.school?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    Assigned Subjects ({teacher.assignedSubjects?.length || 0})
                  </h4>
                  {teacher.assignedSubjects && teacher.assignedSubjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teacher.assignedSubjects.map((subject) => (
                        <div key={subject._id} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:shadow-md transition-all">
                          <p className="font-semibold text-gray-900 mb-1">{subject.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="px-2 py-0.5 bg-green-100 rounded text-green-700 font-medium">
                              {subject.code}
                            </span>
                            <span>•</span>
                            <span>{subject.class?.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No subjects assigned yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {teachers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No teachers found.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
