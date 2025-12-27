"use client";

import { useEffect, useState } from "react";
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
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, BookOpen, Plus } from "lucide-react";

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
      campus?: {
        name: string;
      };
    };
  }>;
}

interface Class {
  _id: string;
  name: string;
  level: number;
}

export default function PrincipalTeachersPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showAddTeacherDialog, setShowAddTeacherDialog] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: "",
    classId: "",
    subjectName: "",
    subjectCode: "",
  });
  const [teacherFormData, setTeacherFormData] = useState({
    email: "",
    name: "",
    phone: "",
    qualification: "",
    experience: 0,
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchData = async () => {
    try {
      const [teachersRes, classesRes] = await Promise.all([
        fetch("/api/admin/teachers"),
        fetch("/api/admin/classes"),
      ]);

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData);
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }
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
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
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
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to assign teacher",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign teacher",
        variant: "destructive",
      });
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherFormData.email || !teacherFormData.name) {
      toast({
        title: "Error",
        description: "Email and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/principal/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherFormData),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Teacher added successfully. An invite will be sent if they don't have an account.",
        });
        setShowAddTeacherDialog(false);
        setTeacherFormData({
          email: "",
          name: "",
          phone: "",
          qualification: "",
          experience: 0,
        });
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add teacher",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive",
      });
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Teacher Management</h2>
            <p className="text-gray-600">Add teachers and assign them to subjects for your campus</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showAddTeacherDialog} onOpenChange={setShowAddTeacherDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Teacher
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Teacher</DialogTitle>
                  <DialogDescription>Add a new teacher to your school. An invite will be sent if they don&apos;t have an account.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacherEmail">Email *</Label>
                    <Input
                      id="teacherEmail"
                      type="email"
                      value={teacherFormData.email}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherName">Name *</Label>
                    <Input
                      id="teacherName"
                      value={teacherFormData.name}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherPhone">Phone (Optional)</Label>
                    <Input
                      id="teacherPhone"
                      value={teacherFormData.phone}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherQualification">Qualification (Optional)</Label>
                    <Input
                      id="teacherQualification"
                      value={teacherFormData.qualification}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, qualification: e.target.value })}
                      placeholder="e.g., MSc Mathematics"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacherExperience">Experience (Years)</Label>
                    <Input
                      id="teacherExperience"
                      type="number"
                      min="0"
                      value={teacherFormData.experience}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, experience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowAddTeacherDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Teacher</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
        </div>
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
                            {subject.class?.campus && (
                              <>
                                <span>•</span>
                                <span className="text-xs text-gray-500">{subject.class.campus.name}</span>
                              </>
                            )}
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
              <p className="text-gray-500">No teachers found for your campus.</p>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}

