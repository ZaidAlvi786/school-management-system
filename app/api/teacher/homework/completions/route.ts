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
    const homeworkId = searchParams.get("homeworkId");

    if (!homeworkId) {
      return NextResponse.json({ error: "Homework ID is required" }, { status: 400 });
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

    // Verify teacher assigned this homework
    const { data: homework } = await supabase
      .from('homework')
      .select('id, assigned_by_id')
      .eq('id', homeworkId)
      .single();

    if (!homework || homework.assigned_by_id !== teacherUser.id) {
      return NextResponse.json({ error: "Unauthorized to view this homework" }, { status: 403 });
    }

    // Get all completions for this homework
    const { data: completions, error: completionsError } = await supabase
      .from('homework_completions')
      .select(`
        id,
        status,
        completed_at,
        approved_at,
        rejected_at,
        rejection_reason,
        remarks,
        student:students!homework_completions_student_id_fkey(
          id,
          roll_number,
          user:users!students_user_id_fkey(
            id,
            name,
            email
          )
        )
      `)
      .eq('homework_id', homeworkId)
      .order('completed_at', { ascending: false });

    if (completionsError) {
      throw completionsError;
    }

    return NextResponse.json({ completions: completions || [] });
  } catch (error: any) {
    console.error("Error fetching homework completions:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch completions" }, { status: 500 });
  }
}

