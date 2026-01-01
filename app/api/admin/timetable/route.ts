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

    // Get first school (admin can access all)
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .limit(1);

    if (!schools || schools.length === 0) {
      return NextResponse.json({ error: "No schools found" }, { status: 404 });
    }

    const schoolId = schools[0].id;

    // Get timetables
    const { data: timetables, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    const junior = timetables?.find(t => t.level_type === 'junior');
    const senior = timetables?.find(t => t.level_type === 'senior');

    return NextResponse.json({ junior, senior });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { junior, senior } = body;

    // Get first school (admin can access all)
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .limit(1);

    if (!schools || schools.length === 0) {
      return NextResponse.json({ error: "No schools found" }, { status: 404 });
    }

    const schoolId = schools[0].id;

    // Find admin user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Deactivate old timetables
    await supabase
      .from('timetables')
      .update({ is_active: false })
      .eq('school_id', schoolId);

    // Insert new timetables
    const timetablesToInsert = [];
    
    if (junior) {
      timetablesToInsert.push({
        school_id: schoolId,
        level_type: 'junior',
        level_range: junior.level_range || '1-5',
        start_time: junior.start_time,
        end_time: junior.end_time,
        late_threshold_minutes: junior.late_threshold_minutes || 15,
        is_active: true,
        created_by_id: user.id,
      });
    }

    if (senior) {
      timetablesToInsert.push({
        school_id: schoolId,
        level_type: 'senior',
        level_range: senior.level_range || '6-10',
        start_time: senior.start_time,
        end_time: senior.end_time,
        late_threshold_minutes: senior.late_threshold_minutes || 15,
        is_active: true,
        created_by_id: user.id,
      });
    }

    if (timetablesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('timetables')
        .insert(timetablesToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ 
      message: "Timetable saved successfully",
      success: true 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

