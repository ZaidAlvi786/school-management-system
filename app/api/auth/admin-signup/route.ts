import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const userName = formData.get("userName") as string;
    const domain = formData.get("domain") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const schoolName = formData.get("schoolName") as string;
    const schoolCode = formData.get("schoolCode") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const province = formData.get("province") as string;
    const schoolType = formData.get("schoolType") as string;
    const certificateType = formData.get("certificateType") as string;
    const certificateNumber = formData.get("certificateNumber") as string;
    const certificateFile = formData.get("certificateFile") as File | null;

    // Validate required fields
    if (!name || !userName || !domain || !password || !schoolName || !schoolCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Check domain availability
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .single();
    
    const { data: existingSchoolDomain } = await supabase
      .from('schools')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .single();
    
    if (existingDomain || existingSchoolDomain) {
      return NextResponse.json(
        { error: "Domain is already taken" },
        { status: 400 }
      );
    }

    // Generate email: userName@domain
    const email = `${userName.toLowerCase()}@${domain.toLowerCase()}`;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Handle certificate file upload
    let certificateUrl = "";
    if (certificateType === "upload" && certificateFile) {
      // Convert file to base64 (in production, use proper file storage like S3, Cloudinary, etc.)
      const bytes = await certificateFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const mimeType = certificateFile.type;
      
      // Store as data URL (in production, upload to cloud storage and store URL)
      certificateUrl = `data:${mimeType};base64,${base64}`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        role: "admin",
        name,
        phone: phone || null,
        is_active: true,
      }])
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    // Create school (admin users don't need Principal - principal can be assigned later)
    const schoolData: any = {
      name: schoolName,
      code: schoolCode,
      address,
      city,
      province,
      type: schoolType as "government" | "private",
      domain: domain.toLowerCase(),
      certificate_type: certificateType as "upload" | "number",
      registration_status: "pending",
    };

    // Only add optional fields if they have values
    if (certificateType === "number" && certificateNumber) {
      schoolData.certificate_number = certificateNumber;
    }
    if (certificateType === "upload" && certificateUrl) {
      schoolData.certificate_url = certificateUrl;
    }

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert([schoolData])
      .select()
      .single();

    if (schoolError) {
      // Rollback user creation if school creation fails
      await supabase.from('users').delete().eq('id', user.id);
      throw schoolError;
    }

    // Create domain record
    const { error: domainError } = await supabase
      .from('domains')
      .insert([{
        domain: domain.toLowerCase(),
        school_id: school.id,
        is_active: true,
      }]);

    if (domainError) {
      // Rollback if domain creation fails
      await supabase.from('users').delete().eq('id', user.id);
      await supabase.from('schools').delete().eq('id', school.id);
      throw domainError;
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully. Your registration is pending approval.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      school: {
        id: school.id,
        name: school.name,
        domain: school.domain,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create admin account" },
      { status: 500 }
    );
  }
}

