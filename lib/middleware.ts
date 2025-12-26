import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = request.nextUrl;

  // Public routes
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/attendance/mark") ||
    pathname.startsWith("/api/student/info") ||
    (pathname.startsWith("/api/attendance") && request.method === "POST") // Allow POST for QR code attendance marking
  ) {
    return NextResponse.next();
  }

  // Redirect role-specific login pages to unified login
  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/teacher/login") ||
    pathname.startsWith("/student/login") ||
    pathname.startsWith("/parent/login")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = token.role;

  // Role-based access control
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/principal") && role !== "principal") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/teacher") && role !== "teacher") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/parent") && role !== "parent") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

