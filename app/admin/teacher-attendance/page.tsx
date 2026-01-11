"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, UserCheck, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTeacherAttendanceAdmin } from "@/lib/fastapi-client";

interface TeacherAttendance {
  id: string;
  teacher_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  is_late: boolean;
  late_minutes: number;
  teacher: {
    user: {
      name: string;
      email: string;
    };
    employee_id: string;
  };
}

export default function AdminTeacherAttendancePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    lateCount: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "admin") {
      redirect("/");
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAttendance();
    }
  }, [status, selectedDate, filterStatus]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await getTeacherAttendanceAdmin(selectedDate, filterStatus === "all" ? undefined : filterStatus);
      setAttendance(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const present = data?.filter((a: TeacherAttendance) => a.status === "present" || a.status === "late").length || 0;
      const absent = data?.filter((a: TeacherAttendance) => a.status === "absent").length || 0;
      const late = data?.filter((a: TeacherAttendance) => a.is_late === true).length || 0;

      setStats({
        total,
        present,
        absent,
        late,
        lateCount: late,
      });
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teacher attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Teacher Attendance</h1>
            <p className="text-gray-600">View and track teacher attendance records</p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Teachers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.present}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats.late}</div>
                <p className="text-sm text-gray-500 mt-1">{stats.lateCount} teachers arrived late</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance List */}
          {attendance.length > 0 ? (
            <div className="grid gap-4">
              {attendance.map((record) => (
                <Card key={record.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {record.teacher.user.name}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>ID: {record.teacher.employee_id}</span>
                          <span>Email: {record.teacher.user.email}</span>
                          {record.check_in_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Check-in: {record.check_in_time.substring(0, 5)}
                            </span>
                          )}
                          {record.check_out_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Check-out: {record.check_out_time.substring(0, 5)}
                            </span>
                          )}
                          {record.is_late && (
                            <span className="text-yellow-600 font-semibold">
                              Late by {record.late_minutes} minutes
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={`${record.status === 'present' ? 'bg-green-500' :
                        record.status === 'late' ? 'bg-yellow-500' :
                          record.status === 'absent' ? 'bg-red-500' :
                            'bg-gray-500'
                        } text-white text-lg px-4 py-2`}>
                        {record.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Attendance Records</h3>
                <p className="text-gray-600">No teacher attendance records found for the selected date</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

