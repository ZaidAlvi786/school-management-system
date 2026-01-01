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
    const { checkInTime, imageData } = body;

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
      .select('id, school_id')
      .eq('user_id', teacherUser.id)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher record not found" }, { status: 404 });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    // Get timetable for this teacher's school
    // First, get teacher's class to determine level
    const { data: classData } = await supabase
      .from('classes')
      .select('level')
      .eq('class_incharge_id', teacher.id)
      .single();

    let levelType = 'senior'; // default
    if (classData && classData.level <= 5) {
      levelType = 'junior';
    }

    // Get timetable
    const { data: timetable } = await supabase
      .from('timetables')
      .select('start_time, late_threshold_minutes')
      .eq('school_id', teacher.school_id)
      .eq('level_type', levelType)
      .eq('is_active', true)
      .single();

    let status = 'present';
    let isLate = false;
    let lateMinutes = 0;

    if (timetable) {
      const startTime = new Date(`${today}T${timetable.start_time}`);
      const checkInDateTime = new Date(`${today}T${currentTime}`);
      const diffMinutes = Math.floor((checkInDateTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      if (diffMinutes > (timetable.late_threshold_minutes || 15)) {
        status = 'late';
        isLate = true;
        lateMinutes = diffMinutes;
      }
    }

    // Check if attendance already marked for today
    const { data: existingAttendance } = await supabase
      .from('teacher_attendance')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('date', today)
      .single();

    if (existingAttendance) {
      // Update check-in time if not set, or update status
      const { data: updatedAttendance, error: updateError } = await supabase
        .from('teacher_attendance')
        .update({
          check_in_time: currentTime,
          status,
          is_late: isLate,
          late_minutes: lateMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAttendance.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({ 
        message: "Attendance updated successfully",
        attendance: updatedAttendance,
        isLate,
        lateMinutes
      });
    }

    // Create new attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('teacher_attendance')
      .insert({
        teacher_id: teacher.id,
        date: today,
        check_in_time: currentTime,
        status,
        is_late: isLate,
        late_minutes: lateMinutes,
        marked_by_id: teacherUser.id,
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
      isLate,
      lateMinutes
    });
  } catch (error: any) {
    console.error("Error marking teacher attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

