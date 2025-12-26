import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let teachersQuery = supabase
      .from('teachers')
      .select('*, user:users(name, email, phone), school:schools(name, code)');

    // If principal, filter by their school/campus
    if (session.user.role === "principal") {
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

      // Find principal's campus
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

      if (schoolId) {
        teachersQuery = teachersQuery.eq('school_id', schoolId);
      } else {
        return NextResponse.json([]);
      }
    }

    const { data: teachers, error } = await teachersQuery;

    if (error) {
      throw error;
    }

    const teachersWithClasses = await Promise.all(
      (teachers || []).map(async (teacher: any) => {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('*, class:classes(name, level, campus:campuses(name))')
          .eq('teacher_id', teacher.user_id);
        
        return { ...teacher, assignedSubjects: subjects || [] };
      })
    );

    return NextResponse.json(teachersWithClasses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teacherId, classId, subjectName, subjectCode } = body;

    // Find teacher
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, user_id')
      .eq('id', teacherId)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Find class
    const { data: classDoc } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .single();

    if (!classDoc) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Create or update subject
    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', subjectCode)
      .eq('class_id', classId)
      .single();

    let subjectId: string;

    if (existingSubject) {
      // Update existing subject
      const { data: updatedSubject, error: updateError } = await supabase
        .from('subjects')
        .update({ teacher_id: teacher.user_id })
        .eq('id', existingSubject.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      subjectId = updatedSubject.id;
    } else {
      // Create new subject
      const { data: newSubject, error: createError } = await supabase
        .from('subjects')
        .insert([{
          name: subjectName,
          code: subjectCode,
          class_id: classId,
          teacher_id: teacher.user_id,
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      subjectId = newSubject.id;
    }

    // Add to teacher_subjects junction table if not exists
    const { data: existingRelation } = await supabase
      .from('teacher_subjects')
      .select('*')
      .eq('teacher_id', teacher.id)
      .eq('subject_id', subjectId)
      .single();

    if (!existingRelation) {
      await supabase
        .from('teacher_subjects')
        .insert([{
          teacher_id: teacher.id,
          subject_id: subjectId,
        }]);
    }

    const { data: subjectWithDetails } = await supabase
      .from('subjects')
      .select('*, class:classes(name, level), teacher:teachers(user:users(name, email))')
      .eq('id', subjectId)
      .single();

    return NextResponse.json(subjectWithDetails);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subjectId, teacherId } = body;

    // Get teacher user_id
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, user_id')
      .eq('id', teacherId)
      .single();

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const { data: subject, error: updateError } = await supabase
      .from('subjects')
      .update({ teacher_id: teacher.user_id })
      .eq('id', subjectId)
      .select('*, class:classes(name, level), teacher:teachers(user:users(name, email))')
      .single();

    if (updateError) {
      throw updateError;
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Add to teacher_subjects junction table if not exists
    const { data: existingRelation } = await supabase
      .from('teacher_subjects')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId)
      .single();

    if (!existingRelation) {
      await supabase
        .from('teacher_subjects')
        .insert([{
          teacher_id: teacherId,
          subject_id: subjectId,
        }]);
    }

    return NextResponse.json(subject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
