import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { predictStudentPerformance } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pastGrades, attendance, syllabusProgress } = body;

    const forecast = await predictStudentPerformance({
      pastGrades,
      attendance,
      syllabusProgress,
    });

    return NextResponse.json(forecast);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

