import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('*, subject:subjects(name), class:classes(name), generated_by:users(id)')
      .eq('id', id)
      .single();

    if (paperError || !paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Check if teacher owns this paper
    const { data: teacherUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!teacherUser || (paper.generated_by as any)?.id !== teacherUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse the generated content and create Word document
    const content = paper.generated_content;
    
    // Split content into paragraphs
    const lines = content.split("\n").filter((line: string) => line.trim());
    
    const docParagraphs: Paragraph[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        docParagraphs.push(new Paragraph({ text: "" }));
        continue;
      }
      
      // Check for header (school name - usually centered and bold)
      if (line.toUpperCase() === line && line.length > 10 && !line.includes("(") && !line.match(/^\d+\./)) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: 28, // 14pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      }
      // Check for question headers like "Q. 1. MCQs..."
      else if (line.match(/^Q\.\s*\d+\./)) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: 24, // 12pt
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        );
      }
      // Check for section headers like "Long Questions"
      else if (line.match(/^(Long Questions|Part \d+|Section)/i)) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: 24, // 12pt
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        );
      }
      // Check for numbered questions (1., 2., etc.)
      else if (line.match(/^\d+\./)) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: false,
                size: 22, // 11pt
              }),
            ],
            spacing: { before: 100, after: 100 },
            indent: { left: 200 },
          })
        );
      }
      // Check for options (A), (B), (C), (D)
      else if (line.match(/^\([A-D]\)/)) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: 22, // 11pt
              }),
            ],
            spacing: { after: 50 },
            indent: { left: 400 },
          })
        );
      }
      // Check for subject/class info lines
      else if (line.match(/^(Subject|Paper|Max\. Marks|Class|Section|Time Allowed):/)) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: 22, // 11pt
              }),
            ],
            spacing: { after: 50 },
          })
        );
      }
      // Regular text
      else {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22, // 11pt
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docParagraphs,
        },
      ],
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable .docx file
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${paper.title.replace(/[^a-z0-9]/gi, "_")}.docx"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating docx:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
