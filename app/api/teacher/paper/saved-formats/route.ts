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

    // Find teacher
    const { data: teacherUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!teacherUser) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Build query for saved papers (with sample papers)
    let query = supabase
      .from('papers')
      .select(`
        id,
        title,
        sample_paper_url,
        generated_content,
        subject:subjects(id, name),
        class:classes(id, name),
        created_at
      `)
      .eq('generated_by_id', teacherUser.id)
      .not('sample_paper_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Filter by subject/class if provided
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data: savedPapers, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ formats: savedPapers || [] });
  } catch (error: any) {
    console.error("Error fetching saved formats:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch saved formats" }, { status: 500 });
  }
}

