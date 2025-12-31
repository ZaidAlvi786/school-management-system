"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { Calendar, CheckCircle2, XCircle, TrendingUp, Clock, Sparkles, UserPlus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FaceRegistrationDialog from "@/components/face-registration-dialog";
import FaceAttendanceDialog from "@/components/face-attendance-dialog";
import { useToast } from "@/components/ui/use-toast";

interface Attendance {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  marked_by: {
    name: string;
  };
}

export default function StudentAttendancePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    totalDays: 0,
  });
  const [hasRegisteredFace, setHasRegisteredFace] = useState<boolean | null>(null);
  const [checkingFace, setCheckingFace] = useState(false);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [isTodayMarked, setIsTodayMarked] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (status === "authenticated" && session?.user?.role !== "student") {
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
      const response = await fetch("/api/student/face/check");
      if (response.ok) {
        const data = await response.json();
        setHasRegisteredFace(data.hasRegisteredFace);
      }
    } catch (error) {
      console.error("Failed to check face registration:", error);
    } finally {
      setCheckingFace(false);
    }
  };

  const checkTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = attendance.find(a => a.date === today);
    setIsTodayMarked(!!todayRecord);
  };

  useEffect(() => {
    checkTodayAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance]);

  const fetchAttendance = async () => {
    try {
      const response = await fetch("/api/student/attendance");
      if (response.ok) {
        const data = await response.json();
        setAttendance(data);
        
        // Calculate stats
        const presentCount = data.filter((a: Attendance) => a.status === "present" || a.status === "excused").length;
        const absentCount = data.filter((a: Attendance) => a.status === "absent").length;
        const total = data.length;
        const percentage = total > 0 ? (presentCount / total) * 100 : 0;
        
        setStats({
          presentDays: presentCount,
          absentDays: absentCount,
          attendancePercentage: percentage,
          totalDays: total,
        });
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-gradient-to-br from-emerald-500 to-green-500";
      case "absent":
        return "bg-gradient-to-br from-red-500 to-pink-500";
      case "late":
        return "bg-gradient-to-br from-yellow-500 to-orange-500";
      case "excused":
        return "bg-gradient-to-br from-blue-500 to-cyan-500";
      default:
        return "bg-gradient-to-br from-gray-500 to-slate-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-5 w-5 text-white" />;
      case "absent":
        return <XCircle className="h-5 w-5 text-white" />;
      case "late":
        return <Clock className="h-5 w-5 text-white" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-white" />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-0 md:ml-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header with animated gradient background */}
          <div className="mb-6 md:mb-8 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/10 to-pink-600/10 rounded-3xl blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-3 md:p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg transform hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-orange-900 to-red-900 bg-clip-text text-transparent">
                  My Attendance
                </h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">Track your attendance records and stay on top</p>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
                  <Sparkles className="h-6 w-6 text-orange-600 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Mark Attendance Button */}
          <Card className="mb-6 md:mb-8 border-2 bg-gradient-to-r from-blue-50 to-cyan-50 animate-slide-up">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                    Mark Today&apos;s Attendance
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isTodayMarked 
                      ? "Your attendance for today has already been marked."
                      : hasRegisteredFace === false || hasRegisteredFace === null
                      ? "Please register your face first to mark attendance using face recognition."
                      : "Click the button below to mark your attendance using face recognition."}
                  </p>
                </div>
                <div className="flex gap-3">
                  {(hasRegisteredFace === false || hasRegisteredFace === null) && (
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
                  )}
                  {hasRegisteredFace === true && !isTodayMarked && (
                    <Button
                      onClick={() => setShowAttendanceDialog(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </Button>
                  )}
                  {hasRegisteredFace === true && isTodayMarked && (
                    <Button
                      disabled
                      className="bg-gray-400 text-white cursor-not-allowed"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Already Marked
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards with enhanced animations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent animate-gradient mb-3">
                  {stats.attendancePercentage.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 md:h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${stats.attendancePercentage}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer" style={{ animationDelay: "0.1s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  Present Days
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 bg-clip-text text-transparent animate-gradient">
                  {stats.presentDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Days attended</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer" style={{ animationDelay: "0.2s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  Absent Days
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-red-600 bg-clip-text text-transparent animate-gradient">
                  {stats.absentDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Days missed</p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-2xl transition-all duration-300 animate-slide-up hover:scale-[1.02] hover:-translate-y-1 overflow-hidden group cursor-pointer" style={{ animationDelay: "0.3s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  Total Days
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent animate-gradient">
                  {stats.totalDays}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Recorded days</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance List with staggered animations */}
          {attendance.length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {attendance.map((record, index) => (
                <Card
                  key={record.id}
                  className="border-2 hover:shadow-2xl transition-all duration-500 animate-slide-up hover:scale-[1.01] overflow-hidden group relative"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 ${getStatusColor(record.status)} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  <CardContent className="p-4 md:p-6 relative">
                    {/* Decorative elements */}
                    <div className={`absolute top-4 right-4 w-20 h-20 ${getStatusColor(record.status)} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-300`}></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-3 md:gap-4 flex-1">
                        <div className={`p-3 md:p-4 ${getStatusColor(record.status)} rounded-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                          {getStatusIcon(record.status)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Marked by {record.marked_by?.name || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center md:justify-end">
                        <Badge className={`${getStatusColor(record.status)} text-white border-0 capitalize text-xs md:text-sm px-4 py-2 shadow-lg group-hover:scale-105 transition-transform`}>
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 animate-slide-up hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardContent className="py-12 md:py-16 text-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/50"></div>
                <div className="relative z-10">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-full w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 flex items-center justify-center shadow-lg animate-pulse">
                    <Calendar className="h-10 w-10 md:h-12 md:w-12 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Attendance Records</h3>
                  <p className="text-gray-600 text-sm md:text-base">Your attendance records will appear here once they are marked</p>
                </div>
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
          toast({
            title: "Success",
            description: "Your face has been registered successfully!",
          });
        }}
      />

      {/* Face Attendance Dialog */}
      <FaceAttendanceDialog
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
