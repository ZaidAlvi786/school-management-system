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
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");

    let query = supabase
      .from('grades')
      .select('*, student:students(roll_number), subject:subjects(name), teacher:users(name)');

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data: grades, error } = await query
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(grades || []);
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

    const body = await request.json();
    const { student, subject, examType, marks, totalMarks, remarks, date } = body;

    const percentage = (marks / totalMarks) * 100;

    const { data: grade, error } = await supabase
      .from('grades')
      .insert([{
        student_id: student,
        subject_id: subject,
        exam_type: examType,
        marks,
        total_marks: totalMarks,
        percentage,
        teacher_id: session.user.id,
        remarks: remarks || null,
        date: date || new Date().toISOString().split('T')[0],
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(grade);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

