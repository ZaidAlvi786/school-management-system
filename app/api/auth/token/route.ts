import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Generate a JWT token compatible with FastAPI
    // Using the same secret as NextAuth
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "JWT secret not configured" }, { status: 500 });
    }

    // Create JWT payload matching FastAPI expectations
    const payload = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      name: session.user.name,
    };

    // Sign the token (expires in 24 hours)
    const token = jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn: "24h",
    });

    console.log("Token Generated:", {
      sub: payload.sub,
      role: payload.role,
      secretSet: !!secret,
      tokenLength: token.length
    });

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error("Error generating token:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

