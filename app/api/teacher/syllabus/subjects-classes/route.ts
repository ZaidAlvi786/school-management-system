import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find teacher
    const { data: teacherUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!teacherUser) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get teacher record
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });
    }

    // Get teacher's subjects and classes
    // Query subjects table directly (it has teacher_id and class_id)
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select(`
        id,
        name,
        code,
        class_id,
        class:classes(id, name, level)
      `)
      .eq('teacher_id', teacherUser.id);

    if (error) {
      throw error;
    }

    // Group by class and subject
    const grouped = (subjects || []).reduce((acc: any, subject: any) => {
      const classId = subject.class_id;
      if (!acc[classId]) {
        acc[classId] = {
          class: subject.class,
          subjects: [],
        };
      }
      acc[classId].subjects.push({
        id: subject.id,
        name: subject.name,
        code: subject.code,
      });
      return acc;
    }, {});

    return NextResponse.json({ 
      classes: Object.values(grouped),
      subjects: (subjects || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      }))
    });
  } catch (error: any) {
    console.error("Error fetching subjects and classes:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch subjects and classes" }, { status: 500 });
  }
}

