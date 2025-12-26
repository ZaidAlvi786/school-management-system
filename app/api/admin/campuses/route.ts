import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendInviteEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    let query = supabase
      .from('campuses')
      .select('*, school:schools(name, code), incharge:users(name, email), principal:principals(user:users(name, email))');

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    // If principal, only return their campus
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
      const { data: campus } = await supabase
        .from('campuses')
        .select('id')
        .eq('principal_id', principal.id)
        .single();

      if (!campus) {
        return NextResponse.json([]);
      }

      query = query.eq('id', campus.id);
    }

    const { data: campuses, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(campuses || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Only admins can create campuses." }, { status: 401 });
    }

    const body = await request.json();
    const { name, schoolId, address, inchargeId, principalEmail } = body;

    if (!principalEmail) {
      return NextResponse.json({ error: "Principal email is required" }, { status: 400 });
    }

    // Check if principal user exists
    const { data: existingPrincipalUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', principalEmail.toLowerCase())
      .single();

    let principalUserId = existingPrincipalUser?.id;
    let principalId: string | null = null;

    if (existingPrincipalUser) {
      // Check if principal is already assigned to a campus
      const { data: existingPrincipal } = await supabase
        .from('principals')
        .select('id')
        .eq('user_id', existingPrincipalUser.id)
        .single();

      if (existingPrincipal) {
        const { data: existingCampus } = await supabase
          .from('campuses')
          .select('id')
          .eq('principal_id', existingPrincipal.id)
          .single();

        if (existingCampus) {
          return NextResponse.json(
            { error: "This principal is already assigned to another campus" },
            { status: 400 }
          );
        }
        principalId = existingPrincipal.id;
      } else {
        // Create principal record
        const { data: newPrincipal, error: principalError } = await supabase
          .from('principals')
          .insert([{
            user_id: existingPrincipalUser.id,
            employee_id: `EMP-${Date.now()}`,
            qualification: "Principal",
            experience: 0,
            school_id: null,
          }])
          .select()
          .single();

        if (principalError) {
          throw principalError;
        }
        principalId = newPrincipal.id;
      }
    } else {
      // Principal doesn't exist - create user account and send invite
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const emailName = principalEmail.split("@")[0];
      const { data: newPrincipalUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: principalEmail.toLowerCase(),
          password: hashedPassword,
          role: "principal",
          name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
          is_active: true,
        }])
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      principalUserId = newPrincipalUser.id;

      // Create principal record
      const { data: newPrincipal, error: principalError } = await supabase
        .from('principals')
        .insert([{
          user_id: newPrincipalUser.id,
          employee_id: `EMP-${Date.now()}`,
          qualification: "Principal",
          experience: 0,
          school_id: null,
        }])
        .select()
        .single();

      if (principalError) {
        throw principalError;
      }
      principalId = newPrincipal.id;

      // Send invite email with temporary password
      const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
      await sendInviteEmail({
        to: principalEmail.toLowerCase(),
        name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
        role: "principal",
        temporaryPassword: tempPassword,
        loginUrl,
      });
    }

    // Create campus with principal
    const { data: campus, error: campusError } = await supabase
      .from('campuses')
      .insert([{
        name,
        school_id: schoolId,
        address: address || "",
        incharge_id: inchargeId || null,
        principal_id: principalId,
      }])
      .select('*, school:schools(name, code), incharge:users(name, email), principal:principals(user:users(name, email))')
      .single();

    if (campusError) {
      throw campusError;
    }

    return NextResponse.json(campus);
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
    const { id, name, address, inchargeId } = body;

    const { data: campus, error } = await supabase
      .from('campuses')
      .update({
        name,
        address,
        incharge_id: inchargeId || null,
      })
      .eq('id', id)
      .select('*, school:schools(name, code), incharge:users(name, email), principal:principals(user:users(name, email))')
      .single();

    if (error) {
      throw error;
    }

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    return NextResponse.json(campus);
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
      return NextResponse.json({ error: "Campus ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from('campuses')
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
