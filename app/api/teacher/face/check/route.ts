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

    // Find teacher by email
    const { data: teacherUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!teacherUser) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get teacher record
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });
    }

    // Check if face data exists
    const { data: faceData, error: faceError } = await supabase
      .from('teacher_face_data')
      .select('id')
      .eq('teacher_id', teacher.id)
      .single();

    if (faceError && faceError.code !== 'PGRST116') {
      throw faceError;
    }

    // Check if fingerprint/biometric data exists
    const { data: biometricData, error: biometricError } = await supabase
      .from('teacher_biometric_data')
      .select('id')
      .eq('teacher_id', teacher.id)
      .single();

    if (biometricError && biometricError.code !== 'PGRST116') {
      throw biometricError;
    }

    return NextResponse.json({ 
      hasRegisteredFace: !!faceData,
      hasRegisteredFingerprint: !!biometricData,
      teacherId: teacher.id 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

