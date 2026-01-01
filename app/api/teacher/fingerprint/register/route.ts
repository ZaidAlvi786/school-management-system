import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credentialId, publicKey, clientDataJSON, attestationObject } = body;

    if (!credentialId || !publicKey || !clientDataJSON || !attestationObject) {
      return NextResponse.json({ error: "Missing required credential data" }, { status: 400 });
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

    // Convert arrays back to base64 strings for storage
    const credentialIdBase64 = Buffer.from(credentialId).toString('base64url');
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    // Store or update biometric credential
    const { data: biometricData, error } = await supabase
      .from('teacher_biometric_data')
      .upsert({
        teacher_id: teacher.id,
        credential_id: credentialIdBase64,
        public_key: publicKeyBase64,
        counter: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'teacher_id'
      })
      .select()
      .single();

    if (error) {
      console.error("Error storing biometric data:", error);
      throw error;
    }

    return NextResponse.json({ 
      message: "Fingerprint registered successfully",
      success: true 
    });
  } catch (error: any) {
    console.error("Error registering fingerprint:", error);
    return NextResponse.json({ error: error.message || "Failed to register fingerprint" }, { status: 500 });
  }
}

