import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Validate domain format (alphanumeric, hyphens, dots)
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ 
        available: false, 
        error: "Invalid domain format. Use only letters, numbers, hyphens, and dots." 
      }, { status: 400 });
    }

    // Check if domain exists in domains table
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .single();
    
    // Also check in schools table
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .single();

    const isAvailable = !existingDomain && !existingSchool;

    return NextResponse.json({
      available: isAvailable,
      domain: domain.toLowerCase(),
      message: isAvailable 
        ? "Domain is available" 
        : "Domain is already taken",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

