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

    // Get stored face encoding
    const { data: faceData, error: faceError } = await supabase
      .from('student_face_data')
      .select('face_encoding')
      .eq('student_id', student.id)
      .single();

    if (faceError || !faceData) {
      return NextResponse.json({ error: "Face not registered. Please register your face first." }, { status: 404 });
    }

    // Calculate similarity (cosine similarity)
    const storedEncoding = JSON.parse(faceData.face_encoding);
    const similarity = cosineSimilarity(faceEncoding, storedEncoding);

    // Threshold for face match (0.6 is a reasonable threshold)
    const threshold = 0.6;
    
    if (similarity < threshold) {
      return NextResponse.json({ 
        error: "Face recognition failed. Please try again.",
        similarity,
        matched: false
      }, { status: 400 });
    }

    // Check if attendance already marked for today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', student.id)
      .eq('date', today)
      .single();

    if (existingAttendance) {
      return NextResponse.json({ 
        message: "Attendance already marked for today",
        alreadyMarked: true
      });
    }

    // Mark attendance (using student's own user_id as marked_by for self-marked attendance)
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        student_id: student.id,
        date: today,
        status: 'present',
        marked_by_id: studentUser.id, // Self-marked
        remarks: 'Marked via face recognition'
      })
      .select()
      .single();

    if (attendanceError) {
      throw attendanceError;
    }

    return NextResponse.json({ 
      message: "Attendance marked successfully",
      attendance,
      similarity,
      matched: true
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Cosine similarity function
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

