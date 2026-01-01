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

    // Get teacher's subjects - check both teacher_subjects table and subjects table with teacher_id
    // Method 1: Get subjects from teacher_subjects
    const { data: teacherSubjects } = await supabase
      .from('teacher_subjects')
      .select('subject_id')
      .eq('teacher_id', teacher.id);

    // Method 2: Get subjects directly assigned via subjects.teacher_id
    const { data: directSubjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('teacher_id', teacherUser.id);

    // Combine both methods to get all subject IDs
    const subjectIdsFromTeacherSubjects = (teacherSubjects || []).map(ts => ts.subject_id);
    const subjectIdsFromDirect = (directSubjects || []).map(s => s.id);
    const allSubjectIds = [...new Set([...subjectIdsFromTeacherSubjects, ...subjectIdsFromDirect])];

    if (allSubjectIds.length === 0) {
      return NextResponse.json({ syllabus: [] });
    }

    // Get all syllabus for teacher's subjects
    // Filter by assigned_by_id to only show syllabus created by this teacher
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
        completed_at,
        target_completion_date,
        notes,
        materials,
        subject:subjects(id, name, code),
        class:classes(id, name, level),
        assigned_by:users!syllabus_assigned_by_id_fkey(id, name)
      `)
      .in('subject_id', allSubjectIds)
      .eq('assigned_by_id', teacherUser.id)
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

    // Check if subject exists and belongs to the class
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, class_id, teacher_id')
      .eq('id', subjectId)
      .single();

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Verify subject belongs to the specified class
    if (subject.class_id !== classId) {
      return NextResponse.json({ error: "Subject does not belong to this class" }, { status: 400 });
    }

    // Check if teacher is assigned to this subject (via teacher_subjects OR direct teacher_id)
    const { data: teacherSubject } = await supabase
      .from('teacher_subjects')
      .select('teacher_id, subject_id')
      .eq('teacher_id', teacher.id)
      .eq('subject_id', subjectId)
      .single();

    // Also check if subject has teacher_id set directly
    const isDirectlyAssigned = subject.teacher_id && String(subject.teacher_id) === String(teacherUser.id);

    if (!teacherSubject && !isDirectlyAssigned) {
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

