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

    const body = await request.json();
    const { faceEncoding } = body;

    if (!faceEncoding || !Array.isArray(faceEncoding)) {
      return NextResponse.json({ error: "Face encoding is required" }, { status: 400 });
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
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', studentUser.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Store or update face encoding
    const { data: faceData, error } = await supabase
      .from('student_face_data')
      .upsert({
        student_id: student.id,
        face_encoding: JSON.stringify(faceEncoding),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'student_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      message: "Face registered successfully",
      success: true 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

