"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, CheckCircle, XCircle, Clock, Loader2, Calendar, QrCode } from "lucide-react";
import Link from "next/link";

interface Student {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  rollNumber: string;
  section: {
    name: string;
  };
}

interface AttendanceRecord {
  _id: string;
  student: {
    _id: string;
    rollNumber: string;
    user: {
      name: string;
    };
  };
  date: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
}

export default function TeacherAttendancePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [isClassIncharge, setIsClassIncharge] = useState(false);

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
      fetchStudents();
    }
  }, [status]);

  useEffect(() => {
    if (selectedDate && students.length > 0) {
      fetchAttendanceForDate();
    }
  }, [selectedDate, students]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/teacher/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setIsClassIncharge(true);
      } else {
        const error = await res.json();
        if (error.error?.includes("not assigned as a class incharge")) {
          setIsClassIncharge(false);
        } else {
          toast({
            title: "Error",
            description: error.error || "Failed to fetch students",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async () => {
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data);
        
        // Initialize attendance status from existing records
        const statusMap: Record<string, "present" | "absent" | "late" | "excused"> = {};
        const remarksMap: Record<string, string> = {};
        
        data.forEach((record: AttendanceRecord) => {
          statusMap[record.student._id] = record.status;
          if (record.remarks) {
            remarksMap[record.student._id] = record.remarks;
          }
        });
        
        setAttendanceStatus(statusMap);
        setRemarks(remarksMap);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late") => {
    setAttendanceStatus({ ...attendanceStatus, [studentId]: status });
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
      toast({
        title: "Error",
        description: "No students found",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const records = students.map((student) => ({
        student: student._id,
        date: selectedDate,
        status: attendanceStatus[student._id] || "absent",
        remarks: remarks[student._id] || undefined,
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceRecords: records }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Attendance marked successfully",
        });
        fetchAttendanceForDate();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to mark attendance",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "absent":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "late":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-300";
      case "absent":
        return "bg-red-100 text-red-800 border-red-300";
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
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
        <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="py-16 text-center">
                <UserCheck className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                <p className="text-gray-600 mb-4">
                  Only class incharge teachers can mark attendance.
                </p>
                <p className="text-gray-500">
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
      <main className="flex-1 ml-64 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Mark Attendance</h2>
            <p className="text-gray-600">Mark attendance for your class students</p>
          </div>
          <Link href="/teacher/qr-codes">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg">
              <QrCode className="mr-2 h-4 w-4" />
              View QR Codes
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                variant="outline"
              >
                Today
              </Button>
            </div>
          </CardContent>
        </Card>

        {students.length > 0 ? (
          <>
            <Card className="mb-6">
                <CardHeader>
                <CardTitle>Students ({students.length})</CardTitle>
                  <CardDescription>
                  Mark attendance for each student. Default status is Absent.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                  {students.map((student) => {
                    const currentStatus = attendanceStatus[student._id] || "absent";
                    return (
                      <div
                        key={student._id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
                              {student.rollNumber}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{student.user.name}</p>
                              <p className="text-sm text-gray-500">
                                Section {student.section?.name || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={currentStatus === "present" ? "default" : "outline"}
                            className={currentStatus === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => handleStatusChange(student._id, "present")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus === "absent" ? "default" : "outline"}
                            className={currentStatus === "absent" ? "bg-red-600 hover:bg-red-700" : ""}
                            onClick={() => handleStatusChange(student._id, "absent")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Absent
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus === "late" ? "default" : "outline"}
                            className={currentStatus === "late" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                            onClick={() => handleStatusChange(student._id, "late")}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Late
                          </Button>
                        </div>
                        <div className="w-32">
                          <Input
                            placeholder="Remarks (optional)"
                            value={remarks[student._id] || ""}
                            onChange={(e) =>
                              setRemarks({ ...remarks, [student._id]: e.target.value })
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                </CardContent>
              </Card>

            <div className="flex justify-end gap-4 mb-8">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Save Attendance
                  </>
                )}
              </Button>
            </div>
          </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-500">No students are assigned to your class yet</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Recent Attendance Records</h3>
          <div className="grid gap-4">
            {attendanceRecords.length > 0 ? (
              attendanceRecords.map((record) => (
                <Card key={record._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{record.student.user.name}</CardTitle>
                        <CardDescription>
                          Roll: {record.student.rollNumber} | Date: {new Date(record.date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        <span className="font-semibold capitalize">{record.status}</span>
                      </div>
                    </div>
                  </CardHeader>
                  {record.remarks && (
                    <CardContent>
                      <p className="text-gray-700">Remarks: {record.remarks}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">No attendance records for selected date</p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
