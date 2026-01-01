import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const body = await request.json();
    const { topic, description, term, status, is_completed, targetCompletionDate, notes, materials } = body;

    // Verify teacher owns this syllabus
    const { data: syllabus } = await supabase
      .from('syllabus')
      .select('id, assigned_by_id, completed_at, completion_date')
      .eq('id', params.id)
      .single();

    if (!syllabus) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 });
    }

    if (syllabus.assigned_by_id !== teacherUser.id) {
      return NextResponse.json({ error: "Unauthorized to update this syllabus" }, { status: 403 });
    }

    // Update syllabus
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (topic !== undefined) updateData.topic = topic;
    if (description !== undefined) updateData.description = description;
    if (term !== undefined) updateData.term = term;
    if (status !== undefined) updateData.status = status;
    if (targetCompletionDate !== undefined) updateData.target_completion_date = targetCompletionDate;
    if (notes !== undefined) updateData.notes = notes;
    if (materials !== undefined) updateData.materials = materials;

    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      // Check both possible column names (completed_at from migration, completion_date from original schema)
      const syllabusData = syllabus as any;
      const hasCompletionDate = syllabusData.completed_at || syllabusData.completion_date;
      if (is_completed && !hasCompletionDate) {
        // Use completed_at as per the migration schema
        updateData.completed_at = new Date().toISOString();
        updateData.status = 'completed';
      } else if (!is_completed) {
        updateData.completed_at = null;
      }
    }

    const { data: updated, error } = await supabase
      .from('syllabus')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ syllabus: updated });
  } catch (error: any) {
    console.error("Error updating syllabus:", error);
    return NextResponse.json({ error: error.message || "Failed to update syllabus" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Verify teacher owns this syllabus
    const { data: syllabus } = await supabase
      .from('syllabus')
      .select('id, assigned_by_id')
      .eq('id', params.id)
      .single();

    if (!syllabus) {
      return NextResponse.json({ error: "Syllabus not found" }, { status: 404 });
    }

    if (syllabus.assigned_by_id !== teacherUser.id) {
      return NextResponse.json({ error: "Unauthorized to delete this syllabus" }, { status: 403 });
    }

    const { error } = await supabase
      .from('syllabus')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Syllabus deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting syllabus:", error);
    return NextResponse.json({ error: error.message || "Failed to delete syllabus" }, { status: 500 });
  }
}

