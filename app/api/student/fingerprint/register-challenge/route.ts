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

    // Generate challenge
    const challenge = crypto.randomBytes(32);
    const userId = Buffer.from(student.id);

    // Store challenge temporarily (in production, use Redis or similar)
    // For now, we'll return it directly and verify on the server side

    return NextResponse.json({
      challenge: Array.from(challenge).map(b => String.fromCharCode(b)).join(''),
      userId: Array.from(userId).map(b => String.fromCharCode(b)).join(''),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

