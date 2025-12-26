"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Users, UserCheck, Edit, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Class {
  _id: string;
  name: string;
  level: number;
  campus: {
    _id: string;
    name: string;
    school: string;
  };
  sections: Section[];
  classIncharge?: {
    user?: {
      name: string;
      email: string;
    };
  };
}

interface Section {
  _id: string;
  name: string;
  capacity: number;
  currentStrength: number;
}

interface Campus {
  _id: string;
  name: string;
  school: string;
}

export default function PrincipalClassesPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [teachers, setTeachers] = useState<Array<{ _id: string; user: { name: string; email: string } }>>([]);
  const [principalCampusId, setPrincipalCampusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingSection, setSubmittingSection] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showInchargeDialog, setShowInchargeDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassForIncharge, setSelectedClassForIncharge] = useState<Class | null>(null);
  const [inchargeTeacherId, setInchargeTeacherId] = useState<string>("__none__");
  const [formData, setFormData] = useState({
    name: "",
    level: 9,
    campusId: "",
  });
  const [sectionData, setSectionData] = useState({
    name: "",
    capacity: 40,
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchData = async () => {
    try {
      const [classesRes, campusesRes, teachersRes] = await Promise.all([
        fetch("/api/admin/classes"),
        fetch("/api/admin/campuses"),
        fetch("/api/admin/teachers"),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }

      if (campusesRes.ok) {
        const campusesData = await campusesRes.json();
        setCampuses(campusesData);
        // Set principal's campus ID (should be only one)
        if (campusesData.length > 0) {
          setPrincipalCampusId(campusesData[0]._id);
          // Auto-set campus in form if not set
          if (!formData.campusId) {
            setFormData({ ...formData, campusId: campusesData[0]._id });
          }
        }
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData);
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

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sections: [],
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Class created successfully",
        });
        setShowClassDialog(false);
        setFormData({ name: "", level: 9, campusId: principalCampusId || "" });
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create class",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create class",
        variant: "destructive",
      });
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    setSubmittingSection(true);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sectionData,
          classId: selectedClass,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Section created successfully",
        });
        setShowSectionDialog(false);
        setSectionData({ name: "", capacity: 40 });
        setSelectedClass(null);
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create section",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create section",
        variant: "destructive",
      });
    } finally {
      setSubmittingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    try {
      const res = await fetch(`/api/admin/sections?id=${sectionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Section deleted successfully",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete section",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
    }
  };

  const handleAssignIncharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForIncharge) return;

    try {
      const res = await fetch("/api/admin/classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedClassForIncharge._id,
          name: selectedClassForIncharge.name,
          level: selectedClassForIncharge.level,
          classInchargeId: inchargeTeacherId === "__none__" || inchargeTeacherId === "" ? null : inchargeTeacherId,
        }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Class incharge assigned successfully",
        });
        setShowInchargeDialog(false);
        setSelectedClassForIncharge(null);
        setInchargeTeacherId("__none__");
        fetchData();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to assign class incharge",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign class incharge",
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Classes & Sections</h2>
            <p className="text-gray-600">Organize your academic structure by classes and sections for your campus</p>
          </div>
          <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>Add a new class to your campus</DialogDescription>
              </DialogHeader>
              {campuses.length === 0 ? (
                <div className="py-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>No Campus Assigned</strong>
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      You need to be assigned to a campus before you can create classes. Please contact your administrator to assign you to a campus.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Class Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Class 9"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Class Level</Label>
                    <Input
                      id="level"
                      type="number"
                      min="1"
                      max="12"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  {campuses.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="campusId">Campus</Label>
                      <Input
                        id="campusId"
                        value={campuses[0].name}
                        disabled
                        className="bg-gray-100"
                      />
                      <input type="hidden" value={formData.campusId || campuses[0]._id} />
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowClassDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Class</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {classes.map((cls) => (
            <Card key={cls._id} className="overflow-hidden border-2 hover:border-purple-300 transition-all duration-300 hover:shadow-xl">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
                <CardHeader className="p-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3 text-white mb-2">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-2xl">{cls.name}</span>
                          <span className="text-lg text-white/80 ml-2">(Level {cls.level})</span>
                        </div>
                      </CardTitle>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                          📍 {cls.campus?.name || "Unknown Campus"}
                        </span>
                        {cls.classIncharge?.user && (
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                            👤 {cls.classIncharge.user.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog
                        open={showInchargeDialog && selectedClassForIncharge?._id === cls._id}
                        onOpenChange={(open) => {
                          setShowInchargeDialog(open);
                          if (open) {
                            setSelectedClassForIncharge(cls);
                            // Find the teacher ID from the teachers list
                            const currentIncharge = teachers.find(t => 
                              cls.classIncharge?.user?.email === t.user.email
                            );
                            setInchargeTeacherId(currentIncharge?._id || "__none__");
                          } else {
                            setSelectedClassForIncharge(null);
                            setInchargeTeacherId("__none__");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="bg-white text-purple-600 hover:bg-white/90 shadow-lg border-white/20"
                            onClick={() => {
                              setSelectedClassForIncharge(cls);
                              // Find the teacher ID from the teachers list
                              const currentIncharge = teachers.find(t => 
                                cls.classIncharge?.user?.email === t.user.email
                              );
                              setInchargeTeacherId(currentIncharge?._id || "__none__");
                            }}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            {cls.classIncharge?.user ? "Change Incharge" : "Assign Incharge"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Class Incharge</DialogTitle>
                            <DialogDescription>
                              Assign a teacher as class incharge for {cls.name}. The teacher must be assigned to at least one subject in your campus.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAssignIncharge} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="inchargeTeacher">Teacher</Label>
                              <Select
                                value={inchargeTeacherId}
                                onValueChange={setInchargeTeacherId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None (Remove incharge)</SelectItem>
                                  {teachers.map((teacher) => (
                                    <SelectItem key={teacher._id} value={teacher._id}>
                                      {teacher.user.name} ({teacher.user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowInchargeDialog(false);
                                  setSelectedClassForIncharge(null);
                                  setInchargeTeacherId("__none__");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">Assign</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Dialog
                        open={showSectionDialog && selectedClass === cls._id}
                        onOpenChange={(open) => {
                          setShowSectionDialog(open);
                          if (open) setSelectedClass(cls._id);
                          else setSelectedClass(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-white text-purple-600 hover:bg-white/90 shadow-lg" onClick={() => setSelectedClass(cls._id)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Section
                          </Button>
                        </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Section</DialogTitle>
                          <DialogDescription>Add a new section to {cls.name}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateSection} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="sectionName">Section Name</Label>
                            <Input
                              id="sectionName"
                              value={sectionData.name}
                              onChange={(e) => setSectionData({ ...sectionData, name: e.target.value })}
                              placeholder="A"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input
                              id="capacity"
                              type="number"
                              min="1"
                              value={sectionData.capacity}
                              onChange={(e) =>
                                setSectionData({ ...sectionData, capacity: parseInt(e.target.value) })
                              }
                              required
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowSectionDialog(false);
                                setSelectedClass(null);
                              }}
                              disabled={submittingSection}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={submittingSection}>
                              {submittingSection ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create Section"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                </CardHeader>
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      Sections ({cls.sections?.length || 0})
                    </h4>
                  </div>
                  {cls.sections && cls.sections.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cls.sections.map((section) => {
                        const capacityPercent = (section.currentStrength / section.capacity) * 100;
                        return (
                          <div
                            key={section._id}
                            className="group flex justify-between items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Section {section.name}</p>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      capacityPercent >= 90
                                        ? "bg-red-500"
                                        : capacityPercent >= 70
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    }`}
                                    style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium text-gray-600 min-w-[60px]">
                                  {section.currentStrength}/{section.capacity}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSection(section._id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No sections yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {classes.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4">
                  <Users className="h-12 w-12 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Start organizing your academic structure by creating classes and sections for your campus.
                </p>
                {campuses.length > 0 && (
                  <Button
                    onClick={() => setShowClassDialog(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Class
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}

