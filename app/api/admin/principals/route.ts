import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendInviteEmail, sendNotificationEmail } from "@/lib/email";

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
    // Use maybeSingle() instead of single() to avoid errors when user doesn't exist
    const { data: existingPrincipalUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    // If there's an actual error (not just "no rows"), log it
    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error(`[PRINCIPAL CREATE] Error checking for existing user:`, userCheckError);
    }

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
        // Create principal record for existing user
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

        // Get user details and school name for notification email
        const { data: userDetails } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', existingPrincipalUser.id)
          .single();

        const { data: schoolData } = await supabase
          .from('schools')
          .select('name')
          .eq('id', school.id)
          .single();

        // Send notification email to existing user
        const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
        console.log(`[PRINCIPAL CREATE] ====== NOTIFICATION EMAIL SENDING START ======`);
        console.log(`[PRINCIPAL CREATE] Email: ${userDetails?.email || email}`);
        console.log(`[PRINCIPAL CREATE] Name: ${userDetails?.name || name || email.split("@")[0]}`);
        console.log(`[PRINCIPAL CREATE] School: ${schoolData?.name || "N/A"}`);
        console.log(`[PRINCIPAL CREATE] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);
        console.log(`[PRINCIPAL CREATE] RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || "not set"}`);
        
        try {
          const emailResult = await sendNotificationEmail({
            to: (userDetails?.email || email).toLowerCase(),
            name: userDetails?.name || name || email.split("@")[0],
            role: "principal",
            schoolName: schoolData?.name || "",
            loginUrl,
          });

          console.log(`[PRINCIPAL CREATE] Email result:`, JSON.stringify(emailResult, null, 2));

          if (!emailResult.success) {
            console.error(`[PRINCIPAL CREATE] ❌ Failed to send notification email:`, emailResult.error);
          } else {
            console.log(`[PRINCIPAL CREATE] ✅ Notification email sent successfully`);
            console.log(`[PRINCIPAL CREATE] Email ID: ${emailResult.data?.id || "N/A"}`);
          }
        } catch (emailError: any) {
          console.error(`[PRINCIPAL CREATE] ❌ Exception in notification email sending:`, emailError);
          console.error(`[PRINCIPAL CREATE] Exception stack:`, emailError.stack);
        }
        console.log(`[PRINCIPAL CREATE] ====== NOTIFICATION EMAIL SENDING END ======`);
      }
    } else {
      // Principal doesn't exist - create user account
      console.log(`[PRINCIPAL CREATE] Creating new principal account for: ${email.toLowerCase()}`);
      const emailName = name || email.split("@")[0];
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      console.log(`[PRINCIPAL CREATE] Creating user account...`);
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
        console.error(`[PRINCIPAL CREATE] Error creating user:`, userError);
        // Check if it's a unique constraint violation (user already exists)
        if (userError.code === '23505' || userError.message?.includes('duplicate') || userError.message?.includes('already exists')) {
          return NextResponse.json(
            { error: "User with this email already exists" },
            { status: 400 }
          );
        }
        throw userError;
      }

      console.log(`[PRINCIPAL CREATE] User created successfully with ID: ${newPrincipalUser.id}`);
      principalUserId = newPrincipalUser.id;

      // Create principal record
      console.log(`[PRINCIPAL CREATE] Creating principal record...`);
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
        console.error(`[PRINCIPAL CREATE] Error creating principal record:`, principalError);
        throw principalError;
      }
      console.log(`[PRINCIPAL CREATE] Principal record created with ID: ${newPrincipal.id}`);
      principalId = newPrincipal.id;

      // Get school name for email (like teachers do)
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name')
        .eq('id', school.id)
        .single();

      // Send invite email with temporary password (same pattern as teachers)
      const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
      console.log(`[PRINCIPAL CREATE] ====== EMAIL SENDING START ======`);
      console.log(`[PRINCIPAL CREATE] Email: ${email.toLowerCase()}`);
      console.log(`[PRINCIPAL CREATE] Name: ${emailName.charAt(0).toUpperCase() + emailName.slice(1)}`);
      console.log(`[PRINCIPAL CREATE] School: ${schoolData?.name || "N/A"}`);
      console.log(`[PRINCIPAL CREATE] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);
      console.log(`[PRINCIPAL CREATE] RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || "not set"}`);
      
      try {
        const emailResult = await sendInviteEmail({
          to: email.toLowerCase(),
          name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
          role: "principal",
          temporaryPassword: tempPassword,
          schoolName: schoolData?.name || "",
          loginUrl,
        });

        console.log(`[PRINCIPAL CREATE] Email result:`, JSON.stringify(emailResult, null, 2));

        // Log email sending result
        if (!emailResult.success) {
          console.error(`[PRINCIPAL CREATE] ❌ Failed to send invite email:`, emailResult.error);
        } else {
          console.log(`[PRINCIPAL CREATE] ✅ Invite email sent successfully`);
          console.log(`[PRINCIPAL CREATE] Email ID: ${emailResult.data?.id || "N/A"}`);
        }
      } catch (emailError: any) {
        console.error(`[PRINCIPAL CREATE] ❌ Exception in email sending:`, emailError);
        console.error(`[PRINCIPAL CREATE] Exception stack:`, emailError.stack);
      }
      console.log(`[PRINCIPAL CREATE] ====== EMAIL SENDING END ======`);
    }


    const { data: principalWithPopulate } = await supabase
      .from('principals')
      .select('*, user:users(name, email, phone), school:schools(name)')
      .eq('id', principalId)
      .single();

    if (!principalWithPopulate) {
      return NextResponse.json({ error: "Failed to retrieve created principal" }, { status: 500 });
    }

    return NextResponse.json(principalWithPopulate);
  } catch (error: any) {
    console.error("Error in POST /api/admin/principals:", error);
    return NextResponse.json({ error: error.message || "Failed to create principal" }, { status: 500 });
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
