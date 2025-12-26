import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const date = searchParams.get("date");
    const classId = searchParams.get("classId");

    let query = supabase
      .from('attendance')
      .select('*, student:students(roll_number, user:users(name)), marked_by:users(name)');
    
    // Date filtering
    if (date) {
      const dateStr = new Date(date).toISOString().split('T')[0];
      query = query.eq('date', dateStr);
    }

    // Student filtering
    if (studentId) {
      query = query.eq('student_id', studentId);
    } else if (session.user.role === "teacher") {
      // If teacher, filter by their class
      const { data: teacherUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
      
      if (teacherUser) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', teacherUser.id)
          .single();
        
        if (teacher) {
          const { data: classDoc } = await supabase
            .from('classes')
            .select('id')
            .eq('class_incharge_id', teacher.id)
            .single();
          
          if (classDoc) {
            // Get all students in this class
            const { data: students } = await supabase
              .from('students')
              .select('id')
              .eq('class_id', classDoc.id);
            
            if (students && students.length > 0) {
              const studentIds = students.map(s => s.id);
              query = query.in('student_id', studentIds);
            } else {
              return NextResponse.json([]);
            }
          }
        }
      }
    } else if (classId) {
      // For admin/principal, filter by class if provided
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId);
      
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        query = query.in('student_id', studentIds);
      } else {
        return NextResponse.json([]);
      }
    }

    const { data: attendance, error } = await query
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(attendance || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendanceRecords, isQRCodeMarking } = body; // Array of { student, date, status, remarks }

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return NextResponse.json({ error: "Attendance records are required" }, { status: 400 });
    }

    let teacherUserId = null;

    // If not QR code marking, require teacher authentication
    if (!isQRCodeMarking) {
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

      teacherUserId = teacherUser.id;

      // Verify teacher is class incharge for these students
      const { data: classDoc } = await supabase
        .from('classes')
        .select('id')
        .eq('class_incharge_id', teacher.id)
        .single();
      
      if (!classDoc) {
        return NextResponse.json({ error: "You are not assigned as a class incharge" }, { status: 403 });
      }
    }

    const results = [];
    
    for (const record of attendanceRecords) {
      const { student, date, status, remarks } = record;
      
      // Verify student exists
      const { data: studentDoc } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', student)
        .single();
      
      if (!studentDoc) {
        continue; // Skip invalid students
      }

      let finalTeacherUserId = teacherUserId;

      // If QR code marking, find the class incharge for this student's class
      if (isQRCodeMarking) {
        const { data: classDoc } = await supabase
          .from('classes')
          .select('class_incharge_id')
          .eq('id', studentDoc.class_id)
          .single();
        
        if (classDoc && classDoc.class_incharge_id) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('user_id')
            .eq('id', classDoc.class_incharge_id)
            .single();
          
          if (teacher) {
            finalTeacherUserId = teacher.user_id;
          } else {
            continue; // Skip if no teacher found
          }
        } else {
          continue; // Skip if no class incharge
        }
      } else {
        // Verify student belongs to teacher's class
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', teacherUserId)
          .single();
        
        if (teacher) {
          const { data: classDoc } = await supabase
            .from('classes')
            .select('id')
            .eq('class_incharge_id', teacher.id)
            .single();
          
          if (!classDoc || studentDoc.class_id !== classDoc.id) {
            continue; // Skip invalid students
          }
        }
      }

      if (!finalTeacherUserId) {
        continue; // Skip if no teacher found
      }

      const dateStr = new Date(date).toISOString().split('T')[0];

      // Use upsert to update if exists, create if not
      const { data: attendance, error: upsertError } = await supabase
        .from('attendance')
        .upsert({
          student_id: student,
          date: dateStr,
          status,
          remarks: remarks || null,
          marked_by_id: finalTeacherUserId,
        }, {
          onConflict: 'student_id,date'
        })
        .select()
        .single();

      if (!upsertError && attendance) {
        results.push(attendance);
      }
    }

    return NextResponse.json({ 
      message: "Attendance marked successfully",
      count: results.length,
      records: results 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
