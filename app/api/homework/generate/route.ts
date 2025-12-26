import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callOpenRouter } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, details, subjectName, className, classLevel } = body;

    if (!topic || !details || !subjectName || !className) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = `You are an expert teacher creating homework assignments for Punjab Board curriculum. 
Generate comprehensive, age-appropriate homework questions that align with Punjab Board standards and curriculum.
The homework should include specific questions that students need to answer, related to the topic covered in class.`;

    const prompt = `Generate a complete homework assignment with specific questions for Punjab Board curriculum.

Subject: ${subjectName}
Class: ${className} (Level ${classLevel || 9})
Topic Covered Today: ${topic}
Details/Points Covered: ${details}

Requirements:
1. Generate 5-8 specific homework questions related to the topic "${topic}"
2. Questions should be based on the details covered: ${details}
3. Include a mix of question types:
   - Short answer questions (2-3 marks each)
   - Long answer questions (5-7 marks each)
   - Practice problems/exercises (if applicable to the subject)
4. Make questions appropriate for ${className} students following Punjab Board curriculum
5. Ensure questions test understanding of the concepts covered in class
6. Questions should be clear, specific, and directly related to the topic

Format the response as JSON:
{
  "title": "Homework: [Topic Name]",
  "instructions": "Brief instructions for students (1-2 sentences)",
  "questions": [
    {
      "number": 1,
      "type": "short|long|practice",
      "question": "Specific question text that students need to answer",
      "marks": number
    }
  ]
}

IMPORTANT: Generate actual questions that students must answer. Do not just describe the homework - provide specific questions.`;

    const response = await callOpenRouter(prompt, systemPrompt);

    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Format questions into a readable description
        let formattedDescription = parsed.instructions || `Homework Assignment: ${topic}\n\n`;
        
        if (parsed.questions && parsed.questions.length > 0) {
          formattedDescription += "Questions:\n\n";
          parsed.questions.forEach((q: any, index: number) => {
            const qNum = q.number || index + 1;
            const marks = q.marks ? ` (${q.marks} marks)` : '';
            formattedDescription += `${qNum}. ${q.question}${marks}\n\n`;
          });
        } else {
          formattedDescription += response;
        }
        
        return NextResponse.json({
          title: parsed.title || `Homework: ${topic}`,
          description: formattedDescription,
          questions: parsed.questions || [],
          instructions: parsed.instructions || "",
        });
      }
    } catch (e) {
      // If JSON parsing fails, try to format the response
      console.error("Error parsing AI response:", e);
    }

    // Fallback: return formatted response
    return NextResponse.json({
      title: `Homework: ${topic}`,
      description: `Homework Assignment: ${topic}\n\n${response}`,
      questions: [],
      instructions: "",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

