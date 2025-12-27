"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Loader2, Smartphone, UserCheck } from "lucide-react";
import { Suspense } from "react";

function MarkAttendanceContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    if (studentId) {
      fetchStudentInfo();
    } else {
      setError("Invalid QR code. Student ID not found.");
    }
  }, [studentId]);

  const fetchStudentInfo = async () => {
    try {
      const res = await fetch(`/api/student/info?id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setStudentName(data.name || "Student");
      }
    } catch (error) {
      console.error("Failed to fetch student info:", error);
    }
  };

  const handleMarkAttendance = async () => {
    if (!studentId) {
      setError("Student ID not found");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceRecords: [
            {
              student: studentId,
              date: today,
              status: "present",
              remarks: "Marked via QR code",
            },
          ],
          isQRCodeMarking: true,
        }),
      });

      if (res.ok) {
        setVerified(true);
        toast({
          title: "Success",
          description: "Attendance marked successfully!",
        });
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to mark attendance");
      }
    } catch (error: any) {
      setError(error.message || "Failed to mark attendance");
    } finally {
      setLoading(false);
    }
  };

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid QR Code</h2>
            <p className="text-gray-600">Please scan a valid student QR code</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Marked!</h2>
            <p className="text-gray-600 mb-4">Your attendance has been successfully recorded</p>
            <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
            <p className="text-sm text-gray-500 mt-2">Status: Present</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Mark Attendance</CardTitle>
          <CardDescription>
            {studentName ? `Welcome, ${studentName}` : "Student Attendance"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-semibold">{error}</p>
            </div>
          )}

          <div className="text-center space-y-4">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300">
              <UserCheck className="h-16 w-16 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mark Your Attendance
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Click the button below to mark your attendance as present
              </p>
              <p className="text-xs text-gray-500">
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>

            <Button
              onClick={handleMarkAttendance}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg h-14 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Marking Attendance...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-5 w-5" />
                  Mark Attendance
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 mt-4">
              Your attendance will be marked as present for today.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MarkAttendancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-16 w-16 mx-auto text-blue-500 mb-4 animate-spin" />
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <MarkAttendanceContent />
    </Suspense>
  );
}
