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

    const formData = await request.formData();
    const faceImage = formData.get("faceImage") as File;

    if (!faceImage) {
      return NextResponse.json({ error: "Face image is required" }, { status: 400 });
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

    // Convert image to base64 for storage
    const arrayBuffer = await faceImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const imageDataUrl = `data:${faceImage.type};base64,${base64Image}`;

    // Store face image (we'll use a simple approach - store the image)
    // In production, you might want to upload to Supabase Storage
    const { data: faceData, error } = await supabase
      .from('student_face_data')
      .upsert({
        student_id: student.id,
        face_encoding: JSON.stringify([]), // Empty for now, we'll process on server if needed
        image_url: imageDataUrl, // Store base64 image
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'student_id'
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

