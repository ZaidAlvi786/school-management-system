import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split('T')[0];
    const statusFilter = searchParams.get("status");

    // Get all teachers (admin can see all)
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, user_id, employee_id, school_id');

    if (!teachers || teachers.length === 0) {
      return NextResponse.json({ attendance: [] });
    }

    const teacherIds = teachers.map(t => t.id);

    // Build query
    let query = supabase
      .from('teacher_attendance')
      .select(`
        *,
        teacher:teachers!teacher_attendance_teacher_id_fkey (
          id,
          employee_id,
          user:users!teachers_user_id_fkey (
            name,
            email
          )
        )
      `)
      .in('teacher_id', teacherIds)
      .eq('date', date);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq('status', statusFilter);
    }

    const { data: attendance, error } = await query.order('check_in_time', { ascending: true });

    if (error) {
      throw error;
    }

    // Format the response
    const formattedAttendance = attendance?.map((record: any) => ({
      id: record.id,
      teacher_id: record.teacher_id,
      date: record.date,
      check_in_time: record.check_in_time,
      check_out_time: record.check_out_time,
      status: record.status,
      is_late: record.is_late,
      late_minutes: record.late_minutes,
      teacher: {
        user: {
          name: record.teacher?.user?.name || "Unknown",
          email: record.teacher?.user?.email || "",
        },
        employee_id: record.teacher?.employee_id || "",
      },
    })) || [];

    return NextResponse.json({ attendance: formattedAttendance });
  } catch (error: any) {
    console.error("Error fetching teacher attendance:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

