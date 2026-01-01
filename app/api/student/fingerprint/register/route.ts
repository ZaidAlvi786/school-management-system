import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credentialId, publicKey, clientDataJSON, attestationObject } = body;

    if (!credentialId || !publicKey || !clientDataJSON || !attestationObject) {
      return NextResponse.json({ error: "Missing required credential data" }, { status: 400 });
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

    // Convert arrays back to base64 strings for storage
    const credentialIdBase64 = Buffer.from(credentialId).toString('base64url');
    const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

    // Store or update biometric credential
    const { data: biometricData, error } = await supabase
      .from('student_biometric_data')
      .upsert({
        student_id: student.id,
        credential_id: credentialIdBase64,
        public_key: publicKeyBase64,
        counter: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'student_id'
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

