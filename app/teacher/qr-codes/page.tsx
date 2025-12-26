"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, Download, UserCheck, Loader2, Wifi, Info } from "lucide-react";

interface StudentQR {
  _id: string;
  name: string;
  rollNumber: string;
  section: string;
  qrCodeDataUrl: string;
  qrData: string;
}

export default function TeacherQRCodesPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassIncharge, setIsClassIncharge] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    networkIP: string | null;
    configuredIP: string | null;
    recommendedIP: string | null;
    url: string | null;
  } | null>(null);

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
      fetchQRCodes();
      fetchNetworkInfo();
    }
  }, [status]);

  const fetchQRCodes = async () => {
    try {
      const res = await fetch("/api/student/qr-code");
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
            description: error.error || "Failed to fetch QR codes",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch QR codes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch("/api/network-info");
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch network info:", error);
    }
  };

  const downloadQRCode = (student: StudentQR) => {
    const link = document.createElement("a");
    link.href = student.qrCodeDataUrl;
    link.download = `QR_${student.rollNumber}_${student.name.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: `QR code downloaded for ${student.name}`,
    });
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
                  Only class incharge teachers can view student QR codes.
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Student QR Codes</h2>
          <p className="text-gray-600">Generate and download QR codes for student attendance</p>
        </div>

        {networkInfo && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Wifi className="h-5 w-5" />
                Mobile Access Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {networkInfo.recommendedIP ? (
                  <>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Network IP Address</p>
                        <p className="text-lg font-bold text-blue-600">{networkInfo.recommendedIP}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Port: 3000</p>
                        <p className="text-xs text-blue-600 font-mono">{networkInfo.url}</p>
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-semibold mb-1">To access from mobile:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Make sure your phone is on the same WiFi network</li>
                            <li>Start the server with: <code className="bg-yellow-100 px-1 rounded">npm run dev:network</code></li>
                            <li>Add to your <code className="bg-yellow-100 px-1 rounded">.env</code> file: <code className="bg-yellow-100 px-1 rounded">LOCAL_NETWORK_IP={networkInfo.recommendedIP}</code></li>
                            <li>Access the app from mobile at: <code className="bg-yellow-100 px-1 rounded">{networkInfo.url}</code></li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Could not detect network IP. Make sure you're connected to WiFi and add <code className="bg-yellow-100 px-1 rounded">LOCAL_NETWORK_IP</code> to your <code className="bg-yellow-100 px-1 rounded">.env</code> file manually.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <Card key={student._id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <CardDescription className="text-blue-100">
                    Roll: {student.rollNumber} | Section: {student.section}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      {student.qrCodeDataUrl ? (
                        <img
                          src={student.qrCodeDataUrl}
                          alt={`QR Code for ${student.name}`}
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                          <QrCode className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => downloadQRCode(student)}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download QR Code
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Students can scan this QR code to mark their attendance
                    </p>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <p className="text-gray-600 font-semibold mb-1">Test URL:</p>
                      <p className="text-blue-600 break-all">{student.qrData}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(student.qrData);
                          toast({
                            title: "Copied!",
                            description: "URL copied to clipboard",
                          });
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-500">No students are assigned to your class yet</p>
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}

