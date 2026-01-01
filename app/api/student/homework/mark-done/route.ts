import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
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

    // Get student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', studentUser.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const body = await request.json();
    const { homeworkId } = body;

    if (!homeworkId) {
      return NextResponse.json({ error: "Homework ID is required" }, { status: 400 });
    }

    // Verify homework exists and is assigned to student's class
    const { data: homework, error: homeworkError } = await supabase
      .from('homework')
      .select('id, class_id, section_id')
      .eq('id', homeworkId)
      .single();

    if (homeworkError || !homework) {
      return NextResponse.json({ error: "Homework not found" }, { status: 404 });
    }

    // Verify student is in the same class
    const { data: studentClass } = await supabase
      .from('students')
      .select('class_id, section_id')
      .eq('id', student.id)
      .single();

    if (studentClass?.class_id !== homework.class_id) {
      return NextResponse.json({ error: "Homework not assigned to your class" }, { status: 403 });
    }

    // Check if already completed
    const { data: existing } = await supabase
      .from('homework_completions')
      .select('id, status')
      .eq('homework_id', homeworkId)
      .eq('student_id', student.id)
      .single();

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json({ error: "Homework already approved" }, { status: 400 });
      }
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('homework_completions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ 
        message: "Homework marked as done",
        completion: updated
      });
    }

    // Create new completion record
    const { data: completion, error: completionError } = await supabase
      .from('homework_completions')
      .insert({
        homework_id: homeworkId,
        student_id: student.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (completionError) {
      throw completionError;
    }

    return NextResponse.json({ 
      message: "Homework marked as done. Waiting for teacher approval.",
      completion
    });
  } catch (error: any) {
    console.error("Error marking homework as done:", error);
    return NextResponse.json({ error: error.message || "Failed to mark homework as done" }, { status: 500 });
  }
}

