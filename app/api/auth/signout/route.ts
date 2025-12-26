import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Clear the session cookie
    const response = NextResponse.json({ 
      success: true,
      message: "Signed out successfully" 
    });
    
    // Clear NextAuth session cookie
    response.cookies.set("next-auth.session-token", "", {
      maxAge: 0,
      path: "/",
    });
    response.cookies.set("__Secure-next-auth.session-token", "", {
      maxAge: 0,
      path: "/",
      secure: true,
    });
    
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to sign out" },
      { status: 500 }
    );
  }
}

