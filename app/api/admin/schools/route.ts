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

    // If admin, only return their own school (found by domain from email)
    if (session.user.role === "admin") {
      const emailParts = session.user.email?.split("@");
      if (!emailParts || emailParts.length !== 2) {
        return NextResponse.json({ error: "Invalid admin email format" }, { status: 400 });
      }
      const domain = emailParts[1].toLowerCase();

      // Find school by domain
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*, principal:principals(user:users(name, email))')
        .eq('domain', domain)
        .single();

      if (schoolError || !school) {
        return NextResponse.json([]);
      }

      const { data: campuses } = await supabase
        .from('campuses')
        .select('*, incharge:users(name, email), principal:principals(user:users(name, email))')
        .eq('school_id', school.id);

      return NextResponse.json([{ ...school, campuses: campuses || [] }]);
    }

    // For principal, return only their school
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

    // Find school by principal (either assigned to school or to campus)
    let schoolId: string | null = principal.school_id;

    if (!schoolId) {
      // Principal assigned to campus - find the campus and its school
      const { data: campus } = await supabase
        .from('campuses')
        .select('school_id')
        .eq('principal_id', principal.id)
        .single();

      if (campus) {
        schoolId = campus.school_id;
      }
    }

    if (!schoolId) {
      return NextResponse.json([]);
    }

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*, principal:principals(user:users(name, email))')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json([]);
    }

    // Get campuses for this school
    // If principal has a campus, only show that campus; otherwise show all campuses
    let campuses;
    if (principal.school_id) {
      // Principal assigned to school (no specific campus) - show all campuses
      const { data: allCampuses } = await supabase
        .from('campuses')
        .select('*, incharge:users(name, email), principal:principals(user:users(name, email))')
        .eq('school_id', schoolId);
      campuses = allCampuses || [];
    } else {
      // Principal assigned to campus - only show their campus
      const { data: principalCampus } = await supabase
        .from('campuses')
        .select('*, incharge:users(name, email), principal:principals(user:users(name, email))')
        .eq('principal_id', principal.id)
        .single();
      campuses = principalCampus ? [principalCampus] : [];
    }

    return NextResponse.json([{ ...school, campuses }]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Only admins can create schools, not principals
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Only admins can create schools." }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, address, city, province, type, principalEmail, campuses } = body;

    // Find principal user
    const { data: principalUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', principalEmail)
      .single();

    if (!principalUser) {
      return NextResponse.json({ error: "Principal user not found. Please create the user first." }, { status: 404 });
    }

    // Check if principal already exists and has a school
    const { data: existingPrincipal } = await supabase
      .from('principals')
      .select('id, school_id')
      .eq('user_id', principalUser.id)
      .single();

    if (existingPrincipal && existingPrincipal.school_id) {
      return NextResponse.json({ error: "Principal is already assigned to another school" }, { status: 400 });
    }

    let principalId = existingPrincipal?.id;

    // Create principal if doesn't exist
    if (!principalId) {
      const { data: newPrincipal, error: principalError } = await supabase
        .from('principals')
        .insert([{
          user_id: principalUser.id,
          employee_id: `EMP-${Date.now()}`,
          qualification: "Principal",
          experience: 0,
          school_id: null, // Will update after school creation
        }])
        .select()
        .single();

      if (principalError) {
        throw principalError;
      }
      principalId = newPrincipal.id;
    }

    // Create school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert([{
        name,
        code,
        address,
        city,
        province,
        type,
        principal_id: principalId,
      }])
      .select()
      .single();

    if (schoolError) {
      throw schoolError;
    }

    // Update principal with school
    await supabase
      .from('principals')
      .update({ school_id: school.id })
      .eq('id', principalId);

    // Create campuses
    if (campuses && campuses.length > 0) {
      await Promise.all(
        campuses.map((campus: any) =>
          supabase.from('campuses').insert([{
            name: campus.name,
            school_id: school.id,
            address: campus.address || address,
            incharge_id: null,
            principal_id: null,
          }])
        )
      );
    }

    const { data: schoolWithPopulate } = await supabase
      .from('schools')
      .select('*, principal:principals(user:users(name, email))')
      .eq('id', school.id)
      .single();

    const { data: schoolCampuses } = await supabase
      .from('campuses')
      .select('*')
      .eq('school_id', school.id);

    return NextResponse.json({ ...schoolWithPopulate, campuses: schoolCampuses || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
