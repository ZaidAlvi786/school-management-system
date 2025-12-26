import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get counts
    const { count: totalSchools } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    const { count: totalCampuses } = await supabase.from('campuses').select('*', { count: 'exact', head: true });
    const { count: totalClasses } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    const { count: totalSections } = await supabase.from('sections').select('*', { count: 'exact', head: true });
    const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true });
    const { count: totalTeachers } = await supabase.from('teachers').select('*', { count: 'exact', head: true });

    // Get average grades
    const { data: grades } = await supabase.from('grades').select('percentage');
    const averageGrade =
      (grades || []).length > 0
        ? (grades || []).reduce((sum: number, g: any) => sum + parseFloat(g.percentage || 0), 0) / (grades || []).length
        : 0;

    // Get attendance stats
    const { data: attendanceRecords } = await supabase.from('attendance').select('status');
    const totalAttendance = (attendanceRecords || []).length;
    const presentCount = (attendanceRecords || []).filter((a: any) => a.status === "present").length;
    const attendanceRate =
      totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    // Get class-wise statistics
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, level, campus:campuses(name)');

    const classStats = await Promise.all(
      (classes || []).map(async (cls: any) => {
        const { data: sections } = await supabase
          .from('sections')
          .select('id')
          .eq('class_id', cls.id);

        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', cls.id);

        const studentIds = (students || []).map((s: any) => s.id);
        
        let classGrades: any[] = [];
        if (studentIds.length > 0) {
          const { data: grades } = await supabase
            .from('grades')
            .select('percentage')
            .in('student_id', studentIds);
          classGrades = grades || [];
        }

        const avgGrade =
          classGrades.length > 0
            ? classGrades.reduce((sum: number, g: any) => sum + parseFloat(g.percentage || 0), 0) / classGrades.length
            : 0;

        return {
          className: cls.name,
          level: cls.level,
          sections: (sections || []).length,
          students: (students || []).length,
          averageGrade: avgGrade.toFixed(2),
        };
      })
    );

    return NextResponse.json({
      overview: {
        totalSchools: totalSchools || 0,
        totalCampuses: totalCampuses || 0,
        totalClasses: totalClasses || 0,
        totalSections: totalSections || 0,
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        averageGrade: averageGrade.toFixed(2),
        attendanceRate: attendanceRate.toFixed(2),
      },
      classStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
