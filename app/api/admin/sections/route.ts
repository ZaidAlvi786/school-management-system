import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, classId, capacity } = body;

    const { data: section, error } = await supabase
      .from('sections')
      .insert([{
        name,
        class_id: classId,
        capacity: capacity || 40,
        current_strength: 0,
      }])
      .select('*, class:classes(name, level)')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(section);
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
    const { id, name, capacity } = body;

    const { data: section, error } = await supabase
      .from('sections')
      .update({
        name,
        capacity,
      })
      .eq('id', id)
      .select('*, class:classes(name, level)')
      .single();

    if (error) {
      throw error;
    }

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(section);
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
      return NextResponse.json({ error: "Section ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from('sections')
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
