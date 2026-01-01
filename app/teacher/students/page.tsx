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
import { Plus, Users, UserPlus, Loader2, Calendar } from "lucide-react";

interface Student {
  _id: string;
  user: {
    name: string;
    email: string;
    phone?: string;
  };
  rollNumber: string;
  admissionNumber: string;
  section: {
    name: string;
  };
  parent?: {
    user: {
      name: string;
      email: string;
    };
  };
  dateOfBirth: string;
  address?: string;
}

interface Section {
  _id: string;
  name: string;
  capacity: number;
  currentStrength: number;
}

export default function TeacherStudentsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isClassIncharge, setIsClassIncharge] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    rollNumber: "",
    admissionNumber: "",
    sectionId: "",
    parentEmail: "",
    parentName: "",
    parentPhone: "",
    dateOfBirth: "",
    address: "",
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
      const res = await fetch("/api/teacher/students");
      if (res.ok) {
        const data = await res.json();
        // Map students data
        const mappedStudents = (data.students || []).map((student: any) => ({
          ...student,
          _id: student.id || student._id,
          rollNumber: student.roll_number || student.rollNumber,
          admissionNumber: student.admission_number || student.admissionNumber,
          dateOfBirth: student.date_of_birth || student.dateOfBirth,
        }));
        // Map sections data to convert id to _id and current_strength to currentStrength
        const mappedSections = (data.sections || []).map((section: any) => ({
          ...section,
          _id: section.id || section._id,
          currentStrength: section.current_strength || section.currentStrength || 0,
        }));
        setStudents(mappedStudents);
        setSections(mappedSections);
        setIsClassIncharge(true);
      } else {
        const error = await res.json();
        if (error.error?.includes("not assigned as a class incharge")) {
          setIsClassIncharge(false);
        } else {
          toast({
            title: "Error",
            description: error.error || "Failed to fetch data",
            variant: "destructive",
          });
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Student added successfully",
        });
        setShowDialog(false);
        setFormData({
          name: "",
          email: "",
          phone: "",
          rollNumber: "",
          admissionNumber: "",
          sectionId: "",
          parentEmail: "",
          parentName: "",
          parentPhone: "",
          dateOfBirth: "",
          address: "",
        });
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add student",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student",
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

  if (!isClassIncharge) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 sm:py-16 text-center">
              <UserPlus className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Only class incharge teachers can add students.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Please contact your principal to be assigned as a class incharge.
              </p>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 animate-slide-up">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Class Students</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage students in your class</p>
        </div>
        <div className="flex justify-end mb-6 sm:mb-8">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>Add a student to your class</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rollNumber">Roll Number *</Label>
                    <Input
                      id="rollNumber"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionNumber">Admission Number *</Label>
                    <Input
                      id="admissionNumber"
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sectionId">Section *</Label>
                  <Select
                    value={formData.sectionId || ""}
                    onValueChange={(value) => setFormData({ ...formData, sectionId: value || "" })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section._id} value={section._id}>
                          {section.name} ({section.currentStrength || 0}/{section.capacity || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <div className="relative">
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                      required
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Parent Information (Optional)</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    If parent email is provided, a parent account will be created and login credentials will be sent via email.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parentName">Parent Name</Label>
                      <Input
                        id="parentName"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">Parent Email</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                        placeholder="parent@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="parentPhone">Parent Phone</Label>
                    <Input
                      id="parentPhone"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDialog(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Student"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {students.length > 0 ? (
            students.map((student) => (
              <Card key={student._id}>
                <CardHeader>
                  <CardTitle>{student.user.name}</CardTitle>
                  <CardDescription>
                    Roll: {student.rollNumber} | Admission: {student.admissionNumber} | Section: {student.section?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Email:</strong> {student.user.email}</p>
                    {student.user.phone && <p className="text-sm"><strong>Phone:</strong> {student.user.phone}</p>}
                    <p className="text-sm"><strong>Date of Birth:</strong> {new Date(student.dateOfBirth).toLocaleDateString()}</p>
                    {student.address && <p className="text-sm"><strong>Address:</strong> {student.address}</p>}
                    {student.parent && (
                      <p className="text-sm"><strong>Parent:</strong> {student.parent.user.name} ({student.parent.user.email})</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Yet</h3>
                <p className="text-gray-500">Start by adding students to your class</p>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

