import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

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

    // Get student record with class and section
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class_id, section_id')
      .eq('user_id', studentUser.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Fetch homework for student's class
    const { data: homework, error: homeworkError } = await supabase
      .from('homework')
      .select(`
        id,
        title,
        description,
        due_date,
        section_id,
        subject:subjects(id, name, code),
        class:classes(id, name),
        section:sections(id, name),
        assigned_by:users!homework_assigned_by_id_fkey(id, name)
      `)
      .eq('class_id', student.class_id)
      .order('due_date', { ascending: false });

    if (homeworkError) {
      throw homeworkError;
    }

    // Filter homework: show if section_id is null (all sections) or matches student's section
    const filteredHomework = (homework || []).filter((hw: any) => {
      return !hw.section_id || hw.section_id === student.section_id;
    });

    // Get completion status for each homework
    const homeworkIds = filteredHomework.map((hw: any) => hw.id);
    const { data: completions } = await supabase
      .from('homework_completions')
      .select('homework_id, status, completed_at, approved_at')
      .eq('student_id', student.id)
      .in('homework_id', homeworkIds);

    // Map completions to homework
    const homeworkWithStatus = filteredHomework.map((hw: any) => {
      const completion = completions?.find((c: any) => c.homework_id === hw.id);
      return {
        ...hw,
        completion_status: completion?.status || 'pending',
        completed_at: completion?.completed_at || null,
        approved_at: completion?.approved_at || null,
      };
    });

    return NextResponse.json(homeworkWithStatus);
  } catch (error: any) {
    console.error("Error fetching student homework:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch homework" }, { status: 500 });
  }
}
