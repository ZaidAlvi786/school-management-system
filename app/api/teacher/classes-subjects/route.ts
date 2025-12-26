import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

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

    // Get all subjects assigned to this teacher
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, code, class_id, class:classes(name, level)')
      .eq('teacher_id', teacherUser.id);

    if (subjectsError) {
      throw subjectsError;
    }

    // Group subjects by class
    const classesMap = new Map();
    
    for (const subject of subjects || []) {
      const classId = subject.class_id;
      if (!classesMap.has(classId)) {
        const { data: sections } = await supabase
          .from('sections')
          .select('id, name')
          .eq('class_id', classId);
        
        classesMap.set(classId, {
          _id: classId,
          name: (subject.class as any)?.name || "",
          level: (subject.class as any)?.level || 0,
          subjects: [],
          sections: sections || [],
        });
      }
      
      const classData = classesMap.get(classId);
      classData.subjects.push({
        _id: subject.id,
        name: subject.name,
        code: subject.code,
      });
    }

    const classes = Array.from(classesMap.values());

    return NextResponse.json({ classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
