import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "teacher") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get("classId");
        const sectionId = searchParams.get("sectionId");
        const subjectId = searchParams.get("subjectId");

        let query = supabase
            .from("materials")
            .select(`
        *,
        classes:class_id (name, level),
        subjects:subject_id (name, code)
      `)
            .eq("uploaded_by_id", session.user.id)
            .order("created_at", { ascending: false });

        if (classId && classId !== "all") query = query.eq("class_id", classId);
        // Note: materials table currently links to class and subject, but not strictly section in the schema provided earlier.
        // However, if the user requested "basis of class section", we might need to check if section_id exists or if it's implied by class.
        // Looking at schema: materials table has subject_id and class_id. It does NOT have section_id.
        // Users table has id.
        // So for now we filter by class and subject.

        if (subjectId && subjectId !== "all") query = query.eq("subject_id", subjectId);

        const { data: materials, error } = await query;

        if (error) throw error;

        return NextResponse.json(materials);
    } catch (error: any) {
        console.error("Error fetching materials:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "teacher") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, subject_id, class_id, file_url, file_type } = body;

        if (!title || !subject_id || !class_id || !file_url || !file_type) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify teacher owns this user_id
        // (Optional strict check, but session.user.id is safe)

        const { data: material, error } = await supabase
            .from("materials")
            .insert({
                title,
                description,
                subject_id,
                class_id,
                file_url,
                file_type,
                uploaded_by_id: session.user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(material);
    } catch (error: any) {
        console.error("Error creating material:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
