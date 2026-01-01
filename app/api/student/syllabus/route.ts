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

    // Get student record with class
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class_id, section_id')
      .eq('user_id', studentUser.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Fetch syllabus for student's class
    const { data: syllabus, error: syllabusError } = await supabase
      .from('syllabus')
      .select(`
        id,
        topic,
        description,
        term,
        status,
        is_completed,
        start_date,
        completion_date,
        target_completion_date,
        notes,
        materials,
        subject:subjects(id, name, code),
        class:classes(id, name, level)
      `)
      .eq('class_id', student.class_id)
      .order('term', { ascending: true })
      .order('created_at', { ascending: true });

    if (syllabusError) {
      throw syllabusError;
    }

    // Filter by section if syllabus has section_id (if implemented)
    // For now, return all syllabus for the class
    return NextResponse.json(syllabus || []);
  } catch (error: any) {
    console.error("Error fetching student syllabus:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch syllabus" }, { status: 500 });
  }
}
