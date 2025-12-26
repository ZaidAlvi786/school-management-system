import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");

    let query = supabase
      .from('homework')
      .select('*, subject:subjects(name), class:classes(name), section:sections(name), assigned_by:users(name)');

    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data: homework, error } = await query
      .order('due_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(homework || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, subject, class: classId, section, dueDate, aiGenerated } = body;

    const { data: homework, error } = await supabase
      .from('homework')
      .insert([{
        title,
        description,
        subject_id: subject,
        class_id: classId,
        section_id: section || null,
        due_date: new Date(dueDate).toISOString(),
        assigned_by_id: teacherUser.id,
        ai_generated: aiGenerated || false,
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(homework);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

