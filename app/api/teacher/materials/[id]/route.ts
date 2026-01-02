import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "teacher") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const id = params.id;

        // Verify ownership
        const { data: material, error: fetchError } = await supabase
            .from("materials")
            .select("uploaded_by_id")
            .eq("id", id)
            .single();

        if (fetchError || !material) {
            return NextResponse.json({ error: "Material not found" }, { status: 404 });
        }

        if (material.uploaded_by_id !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { error: deleteError } = await supabase
            .from("materials")
            .delete()
            .eq("id", id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ message: "Material deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting material:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
