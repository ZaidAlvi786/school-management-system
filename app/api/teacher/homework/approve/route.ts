import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

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
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const body = await request.json();
    const { completionId, action, remarks } = body; // action: 'approve' or 'reject'

    if (!completionId || !action) {
      return NextResponse.json({ error: "Completion ID and action are required" }, { status: 400 });
    }

    // Get completion record
    const { data: completion, error: completionError } = await supabase
      .from('homework_completions')
      .select('id, homework_id, status')
      .eq('id', completionId)
      .single();

    if (completionError || !completion) {
      return NextResponse.json({ error: "Completion not found" }, { status: 404 });
    }

    // Verify teacher assigned this homework
    const { data: homework } = await supabase
      .from('homework')
      .select('id, assigned_by_id')
      .eq('id', completion.homework_id)
      .single();

    if (!homework || homework.assigned_by_id !== teacherUser.id) {
      return NextResponse.json({ error: "Unauthorized to approve this homework" }, { status: 403 });
    }

    // Update completion status
    const updateData: any = {
      updated_at: new Date().toISOString(),
      remarks: remarks || null,
    };

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by_id = teacherUser.id;
      updateData.rejected_at = null;
      updateData.rejected_by_id = null;
      updateData.rejection_reason = null;
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by_id = teacherUser.id;
      updateData.rejection_reason = remarks || 'No reason provided';
      updateData.approved_at = null;
      updateData.approved_by_id = null;
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('homework_completions')
      .update(updateData)
      .eq('id', completionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      message: action === 'approve' ? "Homework approved successfully" : "Homework rejected",
      completion: updated
    });
  } catch (error: any) {
    console.error("Error approving/rejecting homework:", error);
    return NextResponse.json({ error: error.message || "Failed to update homework status" }, { status: 500 });
  }
}

