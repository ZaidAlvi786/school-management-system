"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { Clock, Save, Loader2 } from "lucide-react";

interface Timetable {
  id?: string;
  level_type: "junior" | "senior";
  level_range: string;
  start_time: string;
  end_time: string;
  late_threshold_minutes: number;
  is_active: boolean;
}

export default function AdminTimetablePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timetable, setTimetable] = useState<Timetable>({
    level_type: "junior",
    level_range: "1-5",
    start_time: "08:00",
    end_time: "14:00",
    late_threshold_minutes: 15,
    is_active: true,
  });
  const [seniorTimetable, setSeniorTimetable] = useState<Timetable>({
    level_type: "senior",
    level_range: "6-10",
    start_time: "08:00",
    end_time: "15:00",
    late_threshold_minutes: 15,
    is_active: true,
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
      fetchTimetable();
    }
  }, [status]);

  const fetchTimetable = async () => {
    try {
      const response = await fetch("/api/admin/timetable");
      if (response.ok) {
        const data = await response.json();
        if (data.junior) {
          setTimetable({
            ...data.junior,
            start_time: data.junior.start_time?.substring(0, 5) || "08:00",
            end_time: data.junior.end_time?.substring(0, 5) || "14:00",
          });
        }
        if (data.senior) {
          setSeniorTimetable({
            ...data.senior,
            start_time: data.senior.start_time?.substring(0, 5) || "08:00",
            end_time: data.senior.end_time?.substring(0, 5) || "15:00",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTimetable = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          junior: timetable,
          senior: seniorTimetable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save timetable");
      }

      toast({
        title: "Success",
        description: "Timetable saved successfully!",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save timetable",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">School Timetable</h1>
            <p className="text-gray-600">Set school timings for junior and senior levels</p>
          </div>

          <div className="space-y-6">
            {/* Junior Level Timetable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Junior Level (Classes 1-5)
                </CardTitle>
                <CardDescription>
                  Set timings for junior level classes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="junior-start">Start Time</Label>
                    <Input
                      id="junior-start"
                      type="time"
                      value={timetable.start_time}
                      onChange={(e) => setTimetable({ ...timetable, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="junior-end">End Time</Label>
                    <Input
                      id="junior-end"
                      type="time"
                      value={timetable.end_time}
                      onChange={(e) => setTimetable({ ...timetable, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="junior-late">Late Threshold (minutes)</Label>
                  <Input
                    id="junior-late"
                    type="number"
                    min="0"
                    value={timetable.late_threshold_minutes}
                    onChange={(e) => setTimetable({ ...timetable, late_threshold_minutes: parseInt(e.target.value) || 15 })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Teachers will be marked as late if they arrive after start time + this many minutes
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Senior Level Timetable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Senior Level (Classes 6-10)
                </CardTitle>
                <CardDescription>
                  Set timings for senior level classes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="senior-start">Start Time</Label>
                    <Input
                      id="senior-start"
                      type="time"
                      value={seniorTimetable.start_time}
                      onChange={(e) => setSeniorTimetable({ ...seniorTimetable, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="senior-end">End Time</Label>
                    <Input
                      id="senior-end"
                      type="time"
                      value={seniorTimetable.end_time}
                      onChange={(e) => setSeniorTimetable({ ...seniorTimetable, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="senior-late">Late Threshold (minutes)</Label>
                  <Input
                    id="senior-late"
                    type="number"
                    min="0"
                    value={seniorTimetable.late_threshold_minutes}
                    onChange={(e) => setSeniorTimetable({ ...seniorTimetable, late_threshold_minutes: parseInt(e.target.value) || 15 })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Teachers will be marked as late if they arrive after start time + this many minutes
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={saveTimetable}
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Timetable
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

