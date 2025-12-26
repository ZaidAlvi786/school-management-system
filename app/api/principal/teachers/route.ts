import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "principal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, phone, qualification, experience } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    // Get principal's school/campus
    const { data: principalUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!principalUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: principal } = await supabase
      .from('principals')
      .select('id, school_id')
      .eq('user_id', principalUser.id)
      .single();

    if (!principal) {
      return NextResponse.json({ error: "Principal not found" }, { status: 404 });
    }

    // Find principal's campus or school
    const { data: campus } = await supabase
      .from('campuses')
      .select('school_id')
      .eq('principal_id', principal.id)
      .single();
    
    let schoolId = principal.school_id;
    if (campus) {
      schoolId = campus.school_id;
    } else if (principal.school_id) {
      schoolId = principal.school_id;
    }

    if (!schoolId) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if teacher user exists
    const { data: existingTeacherUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    let teacherUserId = existingTeacherUser?.id;
    let teacher;

    if (existingTeacherUser) {
      // Check if teacher already exists
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('id, school_id')
        .eq('user_id', existingTeacherUser.id)
        .single();
      
      if (existingTeacher) {
        // Check if teacher belongs to this school
        if (existingTeacher.school_id !== schoolId) {
          return NextResponse.json(
            { error: "This teacher is already assigned to another school" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Teacher already exists" },
          { status: 400 }
        );
      }
      
      // Create teacher record for existing user
      const { data: newTeacher, error: teacherError } = await supabase
        .from('teachers')
        .insert([{
          user_id: existingTeacherUser.id,
          employee_id: `EMP-${Date.now()}`,
          school_id: schoolId,
          qualification: qualification || null,
          experience: experience || 0,
        }])
        .select()
        .single();
      
      if (teacherError) {
        throw teacherError;
      }
      teacher = newTeacher;
    } else {
      // Teacher doesn't exist - create user account
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const { data: newTeacherUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "teacher",
          name,
          phone: phone || null,
          is_active: true,
        }])
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      teacherUserId = newTeacherUser.id;

      // Create teacher record
      const { data: newTeacher, error: teacherError } = await supabase
        .from('teachers')
        .insert([{
          user_id: newTeacherUser.id,
          employee_id: `EMP-${Date.now()}`,
          school_id: schoolId,
          qualification: qualification || null,
          experience: experience || 0,
        }])
        .select()
        .single();

      if (teacherError) {
        throw teacherError;
      }
      teacher = newTeacher;

      // Get school name for email
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single();

      // Send invite email with temporary password
      const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
      await sendInviteEmail({
        to: email.toLowerCase(),
        name,
        role: "teacher",
        temporaryPassword: tempPassword,
        schoolName: school?.name || "",
        loginUrl,
      });
    }

    // Get teacher with populated data
    const { data: teacherWithPopulate } = await supabase
      .from('teachers')
      .select('*, user:users(name, email, phone), school:schools(name)')
      .eq('id', teacher.id)
      .single();

    return NextResponse.json(teacherWithPopulate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
