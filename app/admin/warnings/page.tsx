"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, TrendingDown, User } from "lucide-react";

interface AtRiskStudent {
  _id: string;
  name: string;
  email: string;
  className: string;
  section: string;
  averageGrade: string;
  attendancePercentage: string;
}

interface AIInsight {
  _id: string;
  title: string;
  description: string;
  severity: string;
  student?: {
    user?: {
      name: string;
    };
  };
  createdAt: string;
}

export default function WarningsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetchWarnings();
    }
  }, [status]);

  const fetchWarnings = async () => {
    try {
      const { getWarnings } = await import("@/lib/fastapi-client");
      const data = await getWarnings();
      setAtRiskStudents(data.atRiskStudents || []);
      setAiInsights(data.aiInsights || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch warnings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (grade: string, attendance: string) => {
    const gradeNum = parseFloat(grade);
    const attendanceNum = parseFloat(attendance);
    if (gradeNum < 40 || attendanceNum < 60) return "border-red-500 bg-red-50";
    if (gradeNum < 50 || attendanceNum < 75) return "border-orange-500 bg-orange-50";
    return "border-yellow-500 bg-yellow-50";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-rose-50">
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" className="hover:bg-red-50">
                  ← Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                    Early Warning System
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">At-Risk Students</h2>
          <p className="text-gray-600">
            Students with average grade below 50% or attendance below 75% require immediate attention
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          {atRiskStudents.map((student) => (
            <Card
              key={student._id}
              className={`border-l-4 ${getSeverityColor(student.averageGrade, student.attendancePercentage)} hover:shadow-xl transition-all duration-300 overflow-hidden`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-2xl font-bold text-red-600">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        {student.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{student.email}</span>
                        <span>•</span>
                        <span>{student.className} - Section {student.section}</span>
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-gray-600 mb-1">Average Grade</p>
                    <p className="text-3xl font-bold text-red-600">{student.averageGrade}%</p>
                    <div className="mt-2 h-2 bg-red-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min(parseFloat(student.averageGrade), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-sm text-gray-600 mb-1">Attendance</p>
                    <p className="text-3xl font-bold text-orange-600">{student.attendancePercentage}%</p>
                    <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${Math.min(parseFloat(student.attendancePercentage), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">AI-Generated Warnings</h2>
          <p className="text-gray-600">Early warnings generated by AI analysis</p>
        </div>

        <div className="grid gap-6">
          {aiInsights.map((insight) => (
            <Card key={insight._id} className="border-l-4 border-yellow-500 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                  {insight.title}
                </CardTitle>
                <CardDescription>
                  {insight.student?.user?.name || "General Warning"} •{" "}
                  {new Date(insight.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{insight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {atRiskStudents.length === 0 && aiInsights.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No warnings at this time.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
