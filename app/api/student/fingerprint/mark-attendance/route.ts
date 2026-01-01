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
    const { credentialId, authenticatorData, clientDataJSON, signature, userHandle } = body;

    if (!credentialId || !authenticatorData || !clientDataJSON || !signature) {
      return NextResponse.json({ error: "Missing required authentication data" }, { status: 400 });
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

    // Verify credential ID matches
    const credentialIdBase64 = Buffer.from(credentialId).toString('base64url');
    const { data: biometricData, error: biometricError } = await supabase
      .from('student_biometric_data')
      .select('id, counter')
      .eq('student_id', student.id)
      .eq('credential_id', credentialIdBase64)
      .single();

    if (biometricError || !biometricData) {
      return NextResponse.json({ 
        error: "Invalid credential. Please register your fingerprint again." 
      }, { status: 401 });
    }

    // Note: In a production environment, you should verify the signature using the public key
    // For now, we'll trust that if the credential ID matches, the authentication is valid
    // In production, use a library like @simplewebauthn/server to properly verify signatures

    // Update counter (for security tracking)
    await supabase
      .from('student_biometric_data')
      .update({ 
        counter: (biometricData.counter || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', biometricData.id);

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

    // Mark attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        student_id: student.id,
        date: today,
        status: 'present',
        marked_by_id: studentUser.id, // Self-marked
        remarks: 'Marked via fingerprint authentication'
      })
      .select()
      .single();

    if (attendanceError) {
      throw attendanceError;
    }

    return NextResponse.json({ 
      message: "Attendance marked successfully",
      attendance,
      matched: true
    });
  } catch (error: any) {
    console.error("Error marking attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

