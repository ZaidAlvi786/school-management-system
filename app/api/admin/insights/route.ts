import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { detectWeakStudents, generateTeacherInsights } from "@/lib/ai";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let query = supabase
      .from('ai_insights')
      .select('*, school:schools(name, code), class:classes(name, level), student:students(user:users(name, email)), teacher:teachers(user:users(name, email))')
      .order('created_at', { ascending: false })
      .limit(100);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: insights, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(insights || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    let insights: any[] = [];

    if (type === "weak_students" || !type) {
      // Generate weak students insights
      const { data: students } = await supabase
        .from('students')
        .select('id, user:users(name, email), class:classes(name)');

      const studentsWithData = await Promise.all(
        (students || []).map(async (student: any) => {
          const { data: grades } = await supabase
            .from('grades')
            .select('marks, total_marks, percentage, subject_id')
            .eq('student_id', student.id);

          const totalMarks = (grades || []).reduce((sum: number, g: any) => sum + parseFloat(g.marks || 0), 0);
          const totalPossible = (grades || []).reduce((sum: number, g: any) => sum + parseFloat(g.total_marks || 0), 0);
          const averageGrade = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;

          // Group by subject
          const subjectGrades: Record<string, number[]> = {};
          (grades || []).forEach((g: any) => {
            const subjectId = g.subject_id || 'unknown';
            if (!subjectGrades[subjectId]) {
              subjectGrades[subjectId] = [];
            }
            subjectGrades[subjectId].push(parseFloat(g.percentage || 0));
          });

          const subjects = Object.entries(subjectGrades).map(([subjectId, percentages]) => ({
            name: "Subject",
            grade: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2),
          }));

          return {
            name: student.user?.name || "Unknown",
            averageGrade: averageGrade.toFixed(2),
            attendance: 85, // Placeholder
            subjects,
          };
        })
      );

      const weakStudents = await detectWeakStudents(studentsWithData);
      insights.push(...weakStudents.weakStudents);
    }

    if (type === "teacher" || !type) {
      // Generate teacher insights
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, user:users(name, email)');

      for (const teacher of teachers || []) {
        const { data: grades } = await supabase
          .from('grades')
          .select('percentage')
          .eq('teacher_id', (teacher as any).user_id || '');

        const avgGrade =
          (grades || []).length > 0
            ? (grades || []).reduce((sum: number, g: any) => sum + parseFloat(g.percentage || 0), 0) / (grades || []).length
            : 0;

        const insight = await generateTeacherInsights({
          subject: "General",
          classAverage: avgGrade,
          studentCount: (grades || []).length,
          weakStudents: (grades || []).filter((g: any) => parseFloat(g.percentage || 0) < 50).length,
          attendanceRate: 85,
        });

        const { error: insightError } = await supabase
          .from('ai_insights')
          .insert([{
            type: "weak_teacher",
            teacher_id: teacher.id,
            title: `Insights for ${(teacher as any).user?.name}`,
            description: insight.analysis,
            severity: avgGrade < 50 ? "high" : avgGrade < 70 ? "medium" : "low",
            recommendations: insight.recommendations || [],
            data: insight,
          }]);

        if (insightError) {
          console.error('Error creating insight:', insightError);
        }
      }
    }

    const { data: allInsights, error: allInsightsError } = await supabase
      .from('ai_insights')
      .select('*, school:schools(name, code), class:classes(name, level), student:students(user:users(name, email)), teacher:teachers(user:users(name, email))')
      .order('created_at', { ascending: false })
      .limit(100);

    if (allInsightsError) {
      throw allInsightsError;
    }

    return NextResponse.json(allInsights || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
