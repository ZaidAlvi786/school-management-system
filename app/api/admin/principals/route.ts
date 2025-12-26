import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendInviteEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's school by domain from email
    const emailParts = session.user.email?.split("@");
    if (!emailParts || emailParts.length !== 2) {
      return NextResponse.json({ error: "Invalid admin email format" }, { status: 400 });
    }
    const domain = emailParts[1].toLowerCase();

    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('domain', domain)
      .single();

    if (!school) {
      return NextResponse.json([]);
    }

    // Get all principals for this school (either assigned to school or to campuses of this school)
    const { data: schoolPrincipals } = await supabase
      .from('principals')
      .select('*')
      .eq('school_id', school.id);

    // Get principals from campuses
    const { data: campuses } = await supabase
      .from('campuses')
      .select('principal_id')
      .eq('school_id', school.id);

    const campusPrincipalIds = (campuses || [])
      .map(c => c.principal_id)
      .filter(id => id !== null) as string[];

    let allPrincipalIds = (schoolPrincipals || []).map(p => p.id);
    if (campusPrincipalIds.length > 0) {
      const { data: campusPrincipals } = await supabase
        .from('principals')
        .select('*')
        .in('id', campusPrincipalIds);
      
      allPrincipalIds = [...allPrincipalIds, ...(campusPrincipals || []).map(p => p.id)];
    }

    const { data: principals, error } = await supabase
      .from('principals')
      .select('*, user:users(name, email, phone), school:schools(name)')
      .in('id', allPrincipalIds);

    if (error) {
      throw error;
    }

    // Get campus info for each principal
    const principalsWithCampus = await Promise.all(
      (principals || []).map(async (principal: any) => {
        const { data: campus } = await supabase
          .from('campuses')
          .select('name')
          .eq('principal_id', principal.id)
          .single();
        
        return {
          ...principal,
          campus: campus || undefined,
        };
      })
    );

    return NextResponse.json(principalsWithCampus);
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
    const { email, name, phone } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get admin's school
    const emailParts = session.user.email?.split("@");
    if (!emailParts || emailParts.length !== 2) {
      return NextResponse.json({ error: "Invalid admin email format" }, { status: 400 });
    }
    const domain = emailParts[1].toLowerCase();

    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('domain', domain)
      .single();

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if principal user exists
    const { data: existingPrincipalUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    let principalUserId = existingPrincipalUser?.id;
    let principalId: string | null = null;

    if (existingPrincipalUser) {
      // Check if principal already exists
      const { data: existingPrincipal } = await supabase
        .from('principals')
        .select('id, school_id')
        .eq('user_id', existingPrincipalUser.id)
        .single();

      if (existingPrincipal) {
        // Check if already assigned to a campus
        const { data: existingCampus } = await supabase
          .from('campuses')
          .select('id')
          .eq('principal_id', existingPrincipal.id)
          .single();

        if (existingCampus) {
          return NextResponse.json(
            { error: "This principal is already assigned to a campus" },
            { status: 400 }
          );
        }
        // Check if already assigned to this school
        if (existingPrincipal.school_id === school.id) {
          return NextResponse.json(
            { error: "This principal is already assigned to your school" },
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
            school_id: school.id,
          }])
          .select()
          .single();

        if (principalError) {
          throw principalError;
        }
        principalId = newPrincipal.id;
      }
    } else {
      // Principal doesn't exist - create user account
      const emailName = name || email.split("@")[0];
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const { data: newPrincipalUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "principal",
          name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
          phone: phone || null,
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
          school_id: school.id,
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
        to: email.toLowerCase(),
        name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
        role: "principal",
        temporaryPassword: tempPassword,
        loginUrl,
      });
    }

    // Update principal school if needed
    if (principalId && existingPrincipalUser) {
      await supabase
        .from('principals')
        .update({ school_id: school.id })
        .eq('id', principalId);
    }

    const { data: principalWithPopulate } = await supabase
      .from('principals')
      .select('*, user:users(name, email, phone), school:schools(name)')
      .eq('id', principalId)
      .single();

    return NextResponse.json(principalWithPopulate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, phone, qualification, experience } = body;

    if (!id) {
      return NextResponse.json({ error: "Principal ID is required" }, { status: 400 });
    }

    // Get admin's school
    const emailParts = session.user.email?.split("@");
    if (!emailParts || emailParts.length !== 2) {
      return NextResponse.json({ error: "Invalid admin email format" }, { status: 400 });
    }
    const domain = emailParts[1].toLowerCase();

    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('domain', domain)
      .single();

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Find principal and verify it belongs to admin's school
    const { data: principal } = await supabase
      .from('principals')
      .select('id, school_id, user_id')
      .eq('id', id)
      .single();

    if (!principal) {
      return NextResponse.json({ error: "Principal not found" }, { status: 404 });
    }

    // Verify principal belongs to admin's school or its campuses
    const isSchoolPrincipal = principal.school_id === school.id;
    const { data: campusWithPrincipal } = await supabase
      .from('campuses')
      .select('id')
      .eq('principal_id', principal.id)
      .eq('school_id', school.id)
      .single();

    const isCampusPrincipal = !!campusWithPrincipal;

    if (!isSchoolPrincipal && !isCampusPrincipal) {
      return NextResponse.json({ error: "Unauthorized to edit this principal" }, { status: 403 });
    }

    // Update principal fields
    const updateData: any = {};
    if (qualification !== undefined) updateData.qualification = qualification;
    if (experience !== undefined) updateData.experience = experience;
    
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('principals')
        .update(updateData)
        .eq('id', id);
    }

    // Update user fields if provided
    if (name !== undefined || phone !== undefined) {
      const userUpdateData: any = {};
      if (name !== undefined) userUpdateData.name = name;
      if (phone !== undefined) userUpdateData.phone = phone;
      
      await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', principal.user_id);
    }

    const { data: updatedPrincipal } = await supabase
      .from('principals')
      .select('*, user:users(name, email, phone), school:schools(name)')
      .eq('id', id)
      .single();

    // Get campus info
    const { data: campus } = await supabase
      .from('campuses')
      .select('name')
      .eq('principal_id', principal.id)
      .single();

    return NextResponse.json({ ...updatedPrincipal, campus: campus || undefined });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Principal ID is required" }, { status: 400 });
    }

    // Get admin's school
    const emailParts = session.user.email?.split("@");
    if (!emailParts || emailParts.length !== 2) {
      return NextResponse.json({ error: "Invalid admin email format" }, { status: 400 });
    }
    const domain = emailParts[1].toLowerCase();

    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('domain', domain)
      .single();

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Find principal and verify it belongs to admin's school
    const { data: principal } = await supabase
      .from('principals')
      .select('id, school_id')
      .eq('id', id)
      .single();

    if (!principal) {
      return NextResponse.json({ error: "Principal not found" }, { status: 404 });
    }

    // Verify principal belongs to admin's school or its campuses
    const isSchoolPrincipal = principal.school_id === school.id;
    const { data: campusWithPrincipal } = await supabase
      .from('campuses')
      .select('id')
      .eq('principal_id', principal.id)
      .eq('school_id', school.id)
      .single();

    const isCampusPrincipal = !!campusWithPrincipal;

    if (!isSchoolPrincipal && !isCampusPrincipal) {
      return NextResponse.json({ error: "Unauthorized to delete this principal" }, { status: 403 });
    }

    // Check if principal is assigned to a campus - if so, remove the assignment first
    const { data: campus } = await supabase
      .from('campuses')
      .select('id')
      .eq('principal_id', principal.id)
      .single();

    if (campus) {
      await supabase
        .from('campuses')
        .update({ principal_id: null })
        .eq('id', campus.id);
    }

    // Delete principal record (but keep user account)
    const { error } = await supabase
      .from('principals')
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
