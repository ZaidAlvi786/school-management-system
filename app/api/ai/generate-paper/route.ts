import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateExamPaper } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "teacher" && session.user.role !== "principal")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, classLevel, examType, topics, totalMarks } = body;

    const paper = await generateExamPaper(subject, classLevel, examType, topics, totalMarks);

    return NextResponse.json(paper);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

