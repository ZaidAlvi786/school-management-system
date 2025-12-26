import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("id");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id, roll_number, user:users(name, email)')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: student.id,
      name: (student.user as any)?.name,
      rollNumber: student.roll_number,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


