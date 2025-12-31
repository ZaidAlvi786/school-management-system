import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { predictStudentPerformance } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find student by email
    const { data: studentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!studentUser) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get student record
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', studentUser.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Get past grades
    const { data: grades } = await supabase
      .from('grades')
      .select('*, subject:subjects(name)')
      .eq('student_id', student.id)
      .order('date', { ascending: false });

    // Get attendance
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', student.id);

    // Get syllabus progress (if available)
    const { data: syllabus } = await supabase
      .from('syllabus')
      .select('status')
      .eq('class_id', student.class_id);

    // Prepare data for AI
    const pastGrades = (grades || []).map((g: any) => ({
      subject: g.subject?.name || "Unknown",
      marks: g.marks,
      totalMarks: g.total_marks,
      date: g.date,
    }));

    const presentCount = (attendance || []).filter((a: any) => a.status === "present" || a.status === "excused").length;
    const totalAttendance = attendance?.length || 1;
    const attendancePercentage = (presentCount / totalAttendance) * 100;

    const completedSyllabus = (syllabus || []).filter((s: any) => s.status === "completed").length;
    const totalSyllabus = syllabus?.length || 1;
    const syllabusProgressPercentage = (completedSyllabus / totalSyllabus) * 100;

    // Call AI forecast
    const forecast = await predictStudentPerformance({
      pastGrades,
      attendance: {
        present: presentCount,
        total: totalAttendance,
        percentage: attendancePercentage,
      },
      syllabusProgress: {
        completed: completedSyllabus,
        total: totalSyllabus,
        percentage: syllabusProgressPercentage,
      },
    });

    return NextResponse.json(forecast);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

