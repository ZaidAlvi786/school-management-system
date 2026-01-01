import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
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

    // Get stored biometric credential
    const { data: biometricData, error: biometricError } = await supabase
      .from('teacher_biometric_data')
      .select('credential_id, public_key')
      .eq('teacher_id', teacher.id)
      .single();

    if (biometricError || !biometricData) {
      return NextResponse.json({ 
        error: "Fingerprint not registered. Please register your fingerprint first." 
      }, { status: 404 });
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32);

    // Convert base64 strings back to arrays
    const credentialId = Array.from(Buffer.from(biometricData.credential_id, 'base64url'));
    const publicKey = Array.from(Buffer.from(biometricData.public_key, 'base64'));

    return NextResponse.json({
      challenge: Array.from(challenge).map(b => String.fromCharCode(b)).join(''),
      credentialId,
      publicKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

