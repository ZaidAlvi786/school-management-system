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
    const email = searchParams.get("email");
    const role = searchParams.get("role"); // Optional: filter by role (e.g., "principal")

    if (!email || email.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Build query
    let query = supabase
      .from('users')
      .select('email, name, role, phone')
      .ilike('email', `%${email}%`)
      .eq('is_active', true)
      .limit(10);

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

