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

    // Get student record with class and section
    const { data: student } = await supabase
      .from('students')
      .select('class_id, section_id')
      .eq('user_id', studentUser.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Get homework for student's class and section
    const { data: homework, error } = await supabase
      .from('homework')
      .select('*, subject:subjects(name, code), class:classes(name), section:sections(name), assigned_by:users(name)')
      .eq('class_id', student.class_id)
      .eq('section_id', student.section_id)
      .order('due_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(homework || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

