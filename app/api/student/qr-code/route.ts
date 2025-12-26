import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find teacher
    const { data: teacherUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!teacherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Find class where this teacher is the incharge
    const { data: classDoc } = await supabase
      .from('classes')
      .select('id')
      .eq('class_incharge_id', teacherUser.id)
      .single();

    if (!classDoc) {
      return NextResponse.json({ error: "You are not assigned as a class incharge" }, { status: 403 });
    }

    // Get all students in this class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, roll_number, user:users(name, email), section:sections(name)')
      .eq('class_id', classDoc.id);

    if (studentsError) {
      throw studentsError;
    }

    // Use HTTP with local network IP for QR codes
    let baseUrl = "http://localhost:3000";
    
    // Use configured IP if available
    if (process.env.LOCAL_NETWORK_IP) {
      baseUrl = `http://${process.env.LOCAL_NETWORK_IP}:3000`;
    } else {
      // Try to get IP from request headers
      const host = request.headers.get("host");
      if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
        baseUrl = `http://${host}`;
      }
    }
    
    const studentsWithQR = await Promise.all(
      (students || []).map(async (student: any) => {
        const qrData = `${baseUrl}/attendance/mark?studentId=${student.id}`;
        
        // Generate QR code as data URL (base64 image)
        let qrCodeDataUrl = "";
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
        } catch (err) {
          console.error("Error generating QR code:", err);
        }
        
        return {
          _id: student.id,
          name: student.user?.name,
          rollNumber: student.roll_number,
          section: student.section?.name || "N/A",
          qrCodeDataUrl,
          qrData,
        };
      })
    );

    return NextResponse.json({ students: studentsWithQR });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

