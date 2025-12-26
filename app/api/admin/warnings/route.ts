import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { detectWeakStudents } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all students with their grades and attendance
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, roll_number, user:users(name, email), class:classes(name, level), section:sections(name)');

    if (studentsError) {
      throw studentsError;
    }

    const studentsWithData = await Promise.all(
      (students || []).map(async (student: any) => {
        const { data: grades } = await supabase
          .from('grades')
          .select('marks, total_marks, percentage')
          .eq('student_id', student.id);

        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id);

        const totalMarks = (grades || []).reduce((sum: number, g: any) => sum + parseFloat(g.marks || 0), 0);
        const totalPossible = (grades || []).reduce((sum: number, g: any) => sum + parseFloat(g.total_marks || 0), 0);
        const averageGrade = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;

        const presentCount = (attendance || []).filter((a: any) => a.status === "present").length;
        const attendancePercentage =
          (attendance || []).length > 0 ? (presentCount / (attendance || []).length) * 100 : 0;

        // Get subject-wise grades using aggregation in JavaScript
        const subjectGrades: Record<string, { total: number; count: number }> = {};
        (grades || []).forEach((g: any) => {
          const subjectId = g.subject_id || 'unknown';
          if (!subjectGrades[subjectId]) {
            subjectGrades[subjectId] = { total: 0, count: 0 };
          }
          subjectGrades[subjectId].total += parseFloat(g.percentage || 0);
          subjectGrades[subjectId].count += 1;
        });

        const subjects = Object.entries(subjectGrades).map(([subjectId, data]) => ({
          subjectId,
          grade: (data.total / data.count).toFixed(2),
        }));

        return {
          _id: student.id,
          name: student.user?.name || "Unknown",
          email: student.user?.email || "",
          className: student.class?.name || "",
          section: student.section?.name || "",
          averageGrade: averageGrade.toFixed(2),
          attendancePercentage: attendancePercentage.toFixed(2),
          subjects,
        };
      })
    );

    // Filter at-risk students
    const atRiskStudents = studentsWithData.filter(
      (s) => parseFloat(s.averageGrade) < 50 || parseFloat(s.attendancePercentage) < 75
    );

    // Get AI insights for early warnings
    const { data: aiInsights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*, student:students(user:users(name, email))')
      .eq('type', 'early_warning')
      .order('created_at', { ascending: false })
      .limit(50);

    if (insightsError) {
      throw insightsError;
    }

    return NextResponse.json({
      atRiskStudents,
      aiInsights: aiInsights || [],
      totalAtRisk: atRiskStudents.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
