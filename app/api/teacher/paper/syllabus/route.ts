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

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");
    const term = searchParams.get("term"); // Optional: filter by term

    if (!subjectId || !classId) {
      return NextResponse.json({ error: "Subject ID and Class ID are required" }, { status: 400 });
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

    // Build query
    let query = supabase
      .from('syllabus')
      .select(`
        id,
        topic,
        description,
        term,
        status,
        is_completed,
        target_completion_date
      `)
      .eq('subject_id', subjectId)
      .eq('class_id', classId)
      .order('term', { ascending: true })
      .order('created_at', { ascending: true });

    // Filter by term if provided
    if (term && term !== 'all') {
      query = query.eq('term', term);
    }

    const { data: syllabus, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ syllabus: syllabus || [] });
  } catch (error: any) {
    console.error("Error fetching syllabus:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch syllabus" }, { status: 500 });
  }
}

