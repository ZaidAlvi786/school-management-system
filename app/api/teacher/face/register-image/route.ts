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

    const formData = await request.formData();
    const faceImage = formData.get("faceImage") as File;

    if (!faceImage) {
      return NextResponse.json({ error: "Face image is required" }, { status: 400 });
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

    // Convert image to base64 for storage
    const arrayBuffer = await faceImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const imageDataUrl = `data:${faceImage.type};base64,${base64Image}`;

    // Store face image
    const { data: faceData, error } = await supabase
      .from('teacher_face_data')
      .upsert({
        teacher_id: teacher.id,
        face_encoding: JSON.stringify([]),
        image_url: imageDataUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'teacher_id'
      })
      .select()
      .single();

    if (error) {
      console.error("Error storing face data:", error);
      throw error;
    }

    return NextResponse.json({ 
      message: "Face registered successfully",
      success: true 
    });
  } catch (error: any) {
    console.error("Error registering face:", error);
    return NextResponse.json({ error: error.message || "Failed to register face" }, { status: 500 });
  }
}

