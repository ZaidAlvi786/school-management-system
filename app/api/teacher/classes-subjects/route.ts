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
    // First get subjects with class_id
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, code, class_id')
      .eq('teacher_id', teacherUser.id);

    if (subjectsError) {
      throw subjectsError;
    }

    if (!subjects || subjects.length === 0) {
      return NextResponse.json({ classes: [] });
    }

    // Get unique class IDs
    const uniqueClassIds = [...new Set(subjects.map((s: any) => s.class_id))];
    
    // Fetch all classes at once
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, name, level')
      .in('id', uniqueClassIds);

    if (classesError) {
      throw classesError;
    }

    // Create a map of class_id to class data
    const classMap = new Map();
    (classesData || []).forEach((cls: any) => {
      classMap.set(cls.id, cls);
    });

    // Group subjects by class
    const classesMap = new Map();
    
    for (const subject of subjects) {
      const classId = subject.class_id;
      if (!classesMap.has(classId)) {
        const classInfo = classMap.get(classId);
        
        // Fetch sections for this class
        const { data: sections } = await supabase
          .from('sections')
          .select('id, name')
          .eq('class_id', classId);
        
        classesMap.set(classId, {
          _id: classId,
          name: classInfo?.name || "Unknown Class",
          level: classInfo?.level || 0,
          subjects: [],
          sections: sections || [],
        });
      }
      
      const classData = classesMap.get(classId);
      if (classData) {
        classData.subjects.push({
          _id: subject.id,
          name: subject.name,
          code: subject.code,
        });
      }
    }

    const classes = Array.from(classesMap.values());

    return NextResponse.json({ classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
