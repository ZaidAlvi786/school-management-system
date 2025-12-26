import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendInviteEmail } from "@/lib/email";

// Get students for the class incharge's class
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

    // Get sections for this class
    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, capacity, current_strength')
      .eq('class_id', classDoc.id);

    // Get all students in this class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, roll_number, user:users(name, email, phone), section:sections(name), parent:parents(user:users(name, email))')
      .eq('class_id', classDoc.id);

    if (studentsError) {
      throw studentsError;
    }

    return NextResponse.json({ students: students || [], sections: sections || [], classId: classDoc.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create student (only for class incharge)
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: "You are not assigned as a class incharge. Only class incharge teachers can add students." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, rollNumber, admissionNumber, sectionId, parentEmail, parentName, parentPhone, dateOfBirth, address } = body;

    if (!name || !email || !rollNumber || !admissionNumber || !sectionId || !dateOfBirth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify section belongs to the class
    const { data: section } = await supabase
      .from('sections')
      .select('id, class_id, capacity, current_strength')
      .eq('id', sectionId)
      .single();

    if (!section || section.class_id !== classDoc.id) {
      return NextResponse.json({ error: "Invalid section for this class" }, { status: 400 });
    }

    // Check if section has capacity
    if ((section.current_strength || 0) >= section.capacity) {
      return NextResponse.json({ error: "Section is at full capacity" }, { status: 400 });
    }

    // Check if student user already exists
    const { data: existingStudentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingStudentUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Check if roll number or admission number already exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .or(`roll_number.eq.${rollNumber},admission_number.eq.${admissionNumber}`)
      .single();

    if (existingStudent) {
      return NextResponse.json({ error: "Student with this roll number or admission number already exists" }, { status: 400 });
    }

    // Create parent if provided
    let parentId = null;
    if (parentEmail) {
      const { data: existingParentUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', parentEmail.toLowerCase())
        .single();

      if (!existingParentUser) {
        // Create parent user
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const { data: newParentUser, error: parentUserError } = await supabase
          .from('users')
          .insert([{
            email: parentEmail.toLowerCase(),
            password: hashedPassword,
            role: "parent",
            name: parentName || parentEmail.split("@")[0],
            phone: parentPhone || null,
            is_active: true,
          }])
          .select()
          .single();

        if (parentUserError) {
          throw parentUserError;
        }

        // Create parent record
        const { data: newParent, error: parentError } = await supabase
          .from('parents')
          .insert([{
            user_id: newParentUser.id,
            cnic: `CNIC-${Date.now()}`,
            occupation: null,
          }])
          .select()
          .single();

        if (parentError) {
          throw parentError;
        }
        parentId = newParent.id;

        // Send invite email
        const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
        await sendInviteEmail({
          to: parentEmail.toLowerCase(),
          name: parentName || parentEmail.split("@")[0],
          role: "parent",
          temporaryPassword: tempPassword,
          loginUrl,
        });
      } else {
        // Find existing parent or create if doesn't exist
        const { data: existingParent } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', existingParentUser.id)
          .single();

        if (!existingParent) {
          // User exists but Parent record doesn't - create it
          const { data: newParent, error: parentError } = await supabase
            .from('parents')
            .insert([{
              user_id: existingParentUser.id,
              cnic: `CNIC-${Date.now()}`,
              occupation: null,
            }])
            .select()
            .single();

          if (parentError) {
            throw parentError;
          }
          parentId = newParent.id;
        } else {
          parentId = existingParent.id;
        }
      }
    }

    // Create student user
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const { data: studentUser, error: studentUserError } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "student",
        name,
        phone: phone || null,
        is_active: true,
      }])
      .select()
      .single();

    if (studentUserError) {
      throw studentUserError;
    }

    // Create student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert([{
        user_id: studentUser.id,
        roll_number: rollNumber,
        admission_number: admissionNumber,
        class_id: classDoc.id,
        section_id: sectionId,
        parent_id: parentId,
        date_of_birth: new Date(dateOfBirth).toISOString().split('T')[0],
        address: address || null,
      }])
      .select()
      .single();

    if (studentError) {
      throw studentError;
    }

    // Update section strength
    await supabase
      .from('sections')
      .update({ current_strength: (section.current_strength || 0) + 1 })
      .eq('id', sectionId);

    // Send invite email to student
    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    await sendInviteEmail({
      to: email.toLowerCase(),
      name,
      role: "student",
      temporaryPassword: tempPassword,
      loginUrl,
    });

    // Get student with populated data
    const { data: studentWithPopulate } = await supabase
      .from('students')
      .select('*, user:users(name, email, phone), section:sections(name), parent:parents(user:users(name, email))')
      .eq('id', student.id)
      .single();

    return NextResponse.json(studentWithPopulate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
