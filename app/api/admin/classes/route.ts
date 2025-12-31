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

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get("campusId");

    let query = supabase
      .from('classes')
      .select('*, campus:campuses(name, school_id), class_incharge:users(name, email)');

    if (campusId) {
      query = query.eq('campus_id', campusId);
    }

    // If principal, filter by their campus
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
        .select('id')
        .eq('principal_id', principal.id)
        .single();

      if (!campus) {
        // Principal not assigned to campus - return empty or all classes from school
        if (principal.school_id) {
          // Get all campuses of the school
          const { data: schoolCampuses } = await supabase
            .from('campuses')
            .select('id')
            .eq('school_id', principal.school_id);

          if (schoolCampuses && schoolCampuses.length > 0) {
            const campusIds = schoolCampuses.map(c => c.id);
            query = query.in('campus_id', campusIds);
          } else {
            return NextResponse.json([]);
          }
        } else {
          return NextResponse.json([]);
        }
      } else {
        // Only show classes from principal's campus
        query = query.eq('campus_id', campus.id);
      }
    }

    const { data: classes, error } = await query;

    if (error) {
      throw error;
    }

    const classesWithSections = await Promise.all(
      (classes || []).map(async (cls: any) => {
        const { data: sections } = await supabase
          .from('sections')
          .select('*')
          .eq('class_id', cls.id);
        return { ...cls, sections: sections || [] };
      })
    );

    return NextResponse.json(classesWithSections);
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
    const { name, level, campusId, classInchargeId, sections } = body;

    console.log("[CLASS CREATE] Request data:", { campusId, role: session.user.role, email: session.user.email });

    // If principal, verify campus belongs to them
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
      const { data: principalCampus } = await supabase
        .from('campuses')
        .select('id')
        .eq('principal_id', principal.id)
        .maybeSingle();

      console.log("[CLASS CREATE] Principal campus check:", { 
        principalId: principal.id, 
        principalCampus: principalCampus?.id, 
        requestedCampusId: campusId,
        schoolId: principal.school_id 
      });

      // If principal has a specific campus, verify the campusId matches
      if (principalCampus) {
        // Normalize IDs to strings for comparison
        const principalCampusId = String(principalCampus.id);
        const requestedCampusId = String(campusId);
        
        if (principalCampusId !== requestedCampusId) {
          console.log("[CLASS CREATE] Campus ID mismatch:", { principalCampusId, requestedCampusId });
          return NextResponse.json({ error: "Unauthorized. You can only create classes in your campus." }, { status: 403 });
        }
      } else {
        // Principal not assigned to a specific campus - check if they're assigned to the school
        if (principal.school_id) {
          // Verify the campus belongs to the principal's school
          const { data: campus } = await supabase
            .from('campuses')
            .select('school_id')
            .eq('id', campusId)
            .single();

          if (!campus || campus.school_id !== principal.school_id) {
            return NextResponse.json({ error: "Unauthorized. You can only create classes in campuses of your school." }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: "Unauthorized. You are not assigned to a campus or school." }, { status: 403 });
        }
      }

      // Verify class incharge teacher belongs to principal's campus
      if (classInchargeId) {
        // Get teacher user_id
        const { data: teacher } = await supabase
          .from('teachers')
          .select('user_id')
          .eq('id', classInchargeId)
          .single();

        if (teacher) {
          // Verify the teacher is assigned to at least one subject in a class in principal's campus
          const { data: classesInCampus } = await supabase
            .from('classes')
            .select('id')
            .eq('campus_id', campusId);

          const classIds = (classesInCampus || []).map(c => c.id);
          
          if (classIds.length > 0) {
            const { data: subjectWithTeacher } = await supabase
              .from('subjects')
              .select('id')
              .eq('teacher_id', teacher.user_id)
              .in('class_id', classIds)
              .single();

            if (!subjectWithTeacher) {
              return NextResponse.json({ error: "Class incharge teacher must be assigned to a subject in your campus." }, { status: 403 });
            }
          }
        }
      }
    }

    // Convert teacher id to user_id for database insert (class_incharge_id references users.id, not teachers.id)
    let classInchargeUserId: string | null = null;
    if (classInchargeId) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('id', classInchargeId)
        .single();

      if (teacher) {
        classInchargeUserId = teacher.user_id;
      } else {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
    }

    // Create class
    const { data: classDoc, error: classError } = await supabase
      .from('classes')
      .insert([{
        name,
        level,
        campus_id: campusId,
        class_incharge_id: classInchargeUserId,
      }])
      .select()
      .single();

    if (classError) {
      throw classError;
    }

    // Create sections
    if (sections && sections.length > 0) {
      await Promise.all(
        sections.map((section: any) =>
          supabase.from('sections').insert([{
            name: section.name,
            class_id: classDoc.id,
            capacity: section.capacity || 40,
            current_strength: 0,
          }])
        )
      );
    }

    const { data: classWithPopulate } = await supabase
      .from('classes')
      .select('*, campus:campuses(name, school_id), class_incharge:users(name, email)')
      .eq('id', classDoc.id)
      .single();

    const { data: classSections } = await supabase
      .from('sections')
      .select('*')
      .eq('class_id', classDoc.id);

    return NextResponse.json({ ...classWithPopulate, sections: classSections || [] });
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
    const { id, name, level, classInchargeId } = body;

    // Find the class first to verify campus
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id, campus_id')
      .eq('id', id)
      .single();

    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // If principal, verify class belongs to their campus
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
        .select('id')
        .eq('user_id', principalUser.id)
        .single();

      if (!principal) {
        return NextResponse.json({ error: "Principal not found" }, { status: 404 });
      }

      // Find principal's campus
      const { data: principalCampus } = await supabase
        .from('campuses')
        .select('id')
        .eq('principal_id', principal.id)
        .single();

      if (!principalCampus || existingClass.campus_id !== principalCampus.id) {
        return NextResponse.json({ error: "Unauthorized. You can only edit classes in your campus." }, { status: 403 });
      }

      // Verify class incharge teacher belongs to principal's campus and convert teacher id to user_id
      if (classInchargeId) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('user_id')
          .eq('id', classInchargeId)
          .single();

        if (!teacher) {
          return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }
        
        const { data: classesInCampus } = await supabase
          .from('classes')
          .select('id')
          .eq('campus_id', principalCampus.id);

        const classIds = (classesInCampus || []).map(c => c.id);
        
        if (classIds.length > 0) {
          const { data: subjectWithTeacher } = await supabase
            .from('subjects')
            .select('id')
            .eq('teacher_id', teacher.user_id)
            .in('class_id', classIds)
            .single();

          if (!subjectWithTeacher) {
            return NextResponse.json({ error: "Class incharge teacher must be assigned to a subject in your campus." }, { status: 403 });
          }
        }
      }
    }

    // Convert teacher id to user_id for database update (class_incharge_id references users.id, not teachers.id)
    let classInchargeUserId: string | null = null;
    if (classInchargeId) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('id', classInchargeId)
        .single();

      if (teacher) {
        classInchargeUserId = teacher.user_id;
      } else {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
    }

    const { data: classDoc, error } = await supabase
      .from('classes')
      .update({
        name,
        level,
        class_incharge_id: classInchargeUserId,
      })
      .eq('id', id)
      .select('*, campus:campuses(name, school_id), class_incharge:users(name, email)')
      .single();

    if (error) {
      throw error;
    }

    if (!classDoc) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(classDoc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });
    }

    // Delete associated sections
    await supabase.from('sections').delete().eq('class_id', id);
    
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
