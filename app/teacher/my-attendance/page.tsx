"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { Calendar, CheckCircle2, XCircle, Clock, Sparkles, UserPlus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FaceRegistrationDialog from "@/components/face-registration-dialog-simple";
import TeacherFaceAttendanceDialog from "@/components/teacher-face-attendance-dialog";
import { useToast } from "@/components/ui/use-toast";

interface TeacherAttendance {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  is_late: boolean;
  late_minutes: number;
  remarks: string | null;
}

export default function TeacherMyAttendancePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    totalDays: 0,
  });
  const [hasRegisteredFace, setHasRegisteredFace] = useState<boolean | null>(null);
  const [checkingFace, setCheckingFace] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [isTodayMarked, setIsTodayMarked] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<TeacherAttendance | null>(null);

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
      fetchAttendance();
      checkFaceRegistration();
    }
  }, [status]);

  const checkFaceRegistration = async () => {
    try {
      setCheckingFace(true);
      const { getFaceStatus } = await import("@/lib/fastapi-client");
      const data = await getFaceStatus();
      setHasRegisteredFace(data.hasRegisteredFace || false);
    } catch (error) {
      console.error("Failed to check registration:", error);
    } finally {
      setCheckingFace(false);
    }
  };

  const checkTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = attendance.find(a => a.date === today);
    setIsTodayMarked(!!todayRecord);
    setTodayAttendance(todayRecord || null);
  };

  useEffect(() => {
    checkTodayAttendance();
  }, [attendance]);

  const fetchAttendance = async () => {
    try {
      const { getTeacherAttendance } = await import("@/lib/fastapi-client");
      const data = await getTeacherAttendance();
      setAttendance(data);

      // Calculate stats
      const presentCount = data.filter((a: TeacherAttendance) => a.status === "present" || a.status === "late").length;
      const absentCount = data.filter((a: TeacherAttendance) => a.status === "absent").length;
      const lateCount = data.filter((a: TeacherAttendance) => a.is_late === true).length;
      const total = data.length;

      setStats({
        presentDays: presentCount,
        absentDays: absentCount,
        lateDays: lateCount,
        totalDays: total,
      });
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = () => {
    // Open face attendance dialog for verification
    setShowAttendanceDialog(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64 flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  My Attendance
                </h1>
                <p className="text-gray-600 mt-1">Track your attendance and check-in times</p>
              </div>
            </div>
          </div>

          {/* Mark Attendance Section */}
          <Card className="mb-6 md:mb-8 border-2 bg-gradient-to-r from-blue-50 to-cyan-50 animate-slide-up">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                    Mark Today&apos;s Attendance
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isTodayMarked
                      ? todayAttendance?.is_late
                        ? `Your attendance is marked. You were ${todayAttendance.late_minutes} minutes late.`
                        : "Your attendance for today has already been marked."
                      : (hasRegisteredFace === false || hasRegisteredFace === null) && (hasRegisteredFingerprint === false || hasRegisteredFingerprint === null)
                        ? "Please register your face or fingerprint first to mark attendance."
                        : "Choose a method below to mark your attendance."}
                  </p>
                </div>

                {/* Registration Buttons */}
                {(hasRegisteredFace === false || hasRegisteredFace === null) && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {hasRegisteredFace === false || hasRegisteredFace === null ? (
                      <Button
                        onClick={() => setShowRegistrationDialog(true)}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                        disabled={checkingFace}
                      >
                        {checkingFace ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Register Face
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}

                {/* Attendance Marking Buttons */}
                {!isTodayMarked && hasRegisteredFace === true && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {hasRegisteredFace === true && (
                      <Button
                        onClick={() => setShowAttendanceDialog(true)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark with Face
                      </Button>
                    )}
                  </div>
                )}

                {/* Already Marked */}
                {isTodayMarked && (
                  <Button
                    disabled
                    className="bg-gray-400 text-white cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Already Marked
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Present Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-green-600">
                  {stats.presentDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Days attended</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Absent Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-red-600">
                  {stats.absentDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Days missed</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Late Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-yellow-600">
                  {stats.lateDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Times late</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Total Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                  {stats.totalDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Recorded days</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance List */}
          {attendance.length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {attendance.map((record) => (
                <Card key={record.id} className="border-2 hover:shadow-xl transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {record.check_in_time && (
                            <span>Check-in: {record.check_in_time.substring(0, 5)}</span>
                          )}
                          {record.check_out_time && (
                            <span>Check-out: {record.check_out_time.substring(0, 5)}</span>
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
                        } text-white`}>
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
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Attendance Records</h3>
                <p className="text-gray-600">Your attendance records will appear here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Face Registration Dialog */}
      <FaceRegistrationDialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        onSuccess={() => {
          setHasRegisteredFace(true);
          checkFaceRegistration();
          toast({
            title: "Success",
            description: "Your face has been registered successfully!",
          });
        }}
        userType="teacher"
      />

      {/* Face Attendance Dialog */}
      <TeacherFaceAttendanceDialog
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
        onSuccess={() => {
          fetchAttendance();
          toast({
            title: "Success",
            description: "Your attendance has been marked successfully!",
          });
        }}
      />
    </div>
  );
}

