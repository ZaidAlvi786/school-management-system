import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTeacherInsights, detectWeakStudents, detectSyllabusDelay } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "principal" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    let result;

    switch (type) {
      case "teacher":
        result = await generateTeacherInsights(data);
        break;
      case "weak_students":
        result = await detectWeakStudents(data);
        break;
      case "syllabus_delay":
        result = await detectSyllabusDelay(data);
        break;
      default:
        return NextResponse.json({ error: "Invalid insight type" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

