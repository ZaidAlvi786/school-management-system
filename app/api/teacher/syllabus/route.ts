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

    // Get teacher's assigned subjects and classes
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, school_id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });
    }

    // Get teacher's subjects
    const { data: teacherSubjects } = await supabase
      .from('teacher_subjects')
      .select('subject_id, class_id')
      .eq('teacher_id', teacher.id);

    if (!teacherSubjects || teacherSubjects.length === 0) {
      return NextResponse.json({ syllabus: [] });
    }

    // Get all syllabus for teacher's subjects
    const subjectIds = teacherSubjects.map(ts => ts.subject_id);
    const classIds = [...new Set(teacherSubjects.map(ts => ts.class_id))];

    const { data: syllabus, error } = await supabase
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
        class:classes(id, name, level),
        assigned_by:users!syllabus_assigned_by_id_fkey(id, name)
      `)
      .in('subject_id', subjectIds)
      .in('class_id', classIds)
      .order('term', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ syllabus: syllabus || [] });
  } catch (error: any) {
    console.error("Error fetching syllabus:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch syllabus" }, { status: 500 });
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
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const body = await request.json();
    const { topic, description, subjectId, classId, term, targetCompletionDate, notes, materials } = body;

    if (!topic || !subjectId || !classId || !term) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify teacher teaches this subject and class
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });
    }

    const { data: teacherSubject } = await supabase
      .from('teacher_subjects')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('subject_id', subjectId)
      .eq('class_id', classId)
      .single();

    if (!teacherSubject) {
      return NextResponse.json({ error: "You are not assigned to teach this subject/class" }, { status: 403 });
    }

    // Create syllabus entry
    const { data: syllabus, error } = await supabase
      .from('syllabus')
      .insert({
        topic,
        description: description || null,
        subject_id: subjectId,
        class_id: classId,
        term,
        target_completion_date: targetCompletionDate || null,
        notes: notes || null,
        materials: materials || [],
        assigned_by_id: teacherUser.id,
        status: 'pending',
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ syllabus });
  } catch (error: any) {
    console.error("Error creating syllabus:", error);
    return NextResponse.json({ error: error.message || "Failed to create syllabus" }, { status: 500 });
  }
}

