"""
AI service for OpenRouter integration
"""

import os
import httpx
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# Free models with fallback order
MODELS = [
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-7b-instruct",
    "google/gemma-7b",
    "qwen/qwen-2.5-7b-instruct",
]


async def call_openrouter(
    prompt: str,
    system_prompt: str = "You are an educational AI assistant.",
    model_index: int = 0
) -> str:
    """Call OpenRouter API"""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set")
    
    model = MODELS[model_index]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                },
                timeout=60.0
            )
            
            if not response.is_success:
                if model_index < len(MODELS) - 1:
                    # Try next model
                    return await call_openrouter(prompt, system_prompt, model_index + 1)
                raise Exception(f"OpenRouter API error: {response.status_code} {response.text}")
            
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "No response from AI")
    
    except Exception as e:
        if model_index < len(MODELS) - 1:
            # Try next model
            return await call_openrouter(prompt, system_prompt, model_index + 1)
        raise


async def generate_homework_questions(
    subject: str,
    topic: str,
    difficulty: str,
    count: int
) -> List[Dict[str, Any]]:
    """Generate homework questions"""
    prompt = f"""Generate {count} {difficulty} difficulty homework questions for {subject} on the topic: {topic}.

Format as JSON array:
[
  {{
    "question": "question text",
    "type": "short|long|mcq",
    "marks": number,
    "options": ["option1", "option2", ...] (only for MCQ),
    "correctAnswer": "answer" (only for MCQ)
  }}
]"""
    
    response = await call_openrouter(
        prompt,
        "You are an expert teacher creating homework questions."
    )
    
    try:
        json_match = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_match)
        if isinstance(parsed, list):
            return parsed
        return parsed.get("questions", [])
    except Exception as e:
        logger.error(f"Error parsing homework questions: {str(e)}")
        return []


async def generate_exam_paper(
    subject: str,
    class_level: str,
    exam_type: str,
    topics: List[str],
    total_marks: int = 100
) -> Dict[str, Any]:
    """Generate exam paper"""
    prompt = f"""Generate a {exam_type} exam paper for {subject} for class {class_level}.
Topics to cover: {', '.join(topics)}
Total marks: {total_marks}

Requirements:
{"- Generate 20 multiple choice questions with 4 options each" if exam_type == "mcq" else ""}
{"- Generate 10 short answer questions (2-3 marks each)" if exam_type == "short" else ""}
{"- Generate 5 long answer questions (10-15 marks each)" if exam_type == "long" else ""}
{"- Generate a complete exam paper with MCQs, short questions, and long questions" if exam_type == "full" else ""}

Format as JSON:
{{
  "questions": [
    {{
      "type": "mcq|short|long",
      "question": "question text",
      "marks": number,
      "options": ["option1", "option2", ...] (only for MCQ),
      "correctAnswer": "answer" (only for MCQ)
    }}
  ],
  "answerKey": "detailed answer key"
}}"""
    
    response = await call_openrouter(
        prompt,
        "You are an expert educational content generator. Generate high-quality exam papers."
    )
    
    try:
        json_match = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_match)
        return parsed
    except Exception as e:
        logger.error(f"Error parsing exam paper: {str(e)}")
        return {"questions": [], "answerKey": response}


async def grade_student_answer(
    student_answer: str,
    correct_answer: str,
    question: str,
    max_marks: int
) -> Dict[str, Any]:
    """Grade student answer using AI"""
    prompt = f"""Grade this student answer:

Question: {question}
Correct Answer: {correct_answer}
Student Answer: {student_answer}
Maximum Marks: {max_marks}

Provide:
1. Marks awarded (out of {max_marks})
2. Detailed explanation of grading
3. Constructive feedback for the student

Format as JSON:
{{
  "marks": number,
  "explanation": "why these marks were awarded",
  "feedback": "feedback for student"
}}"""
    
    response = await call_openrouter(
        prompt,
        "You are an expert teacher grading student answers fairly and providing constructive feedback."
    )
    
    try:
        json_match = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_match)
        marks = min(max_marks, max(0, parsed.get("marks", max_marks * 0.5)))
        return {
            "marks": marks,
            "explanation": parsed.get("explanation", "AI grading completed"),
            "feedback": parsed.get("feedback", "Good effort!")
        }
    except Exception as e:
        logger.error(f"Error parsing grade: {str(e)}")
        return {
            "marks": max_marks * 0.5,
            "explanation": "AI grading completed",
            "feedback": response
        }


async def predict_student_performance(
    student_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Predict student performance"""
    past_grades = student_data.get("pastGrades", [])
    attendance = student_data.get("attendance", {})
    syllabus_progress = student_data.get("syllabusProgress", {})
    
    grades_text = "\n".join([
        f"{g['subject']}: {g['marks']}/{g['totalMarks']} ({((g['marks'] / g['totalMarks']) * 100):.1f}%)"
        for g in past_grades
    ])
    
    prompt = f"""Analyze this student's performance data and predict future performance:

Past Grades:
{grades_text}

Attendance: {attendance.get('present', 0)}/{attendance.get('total', 0)} ({attendance.get('percentage', 0)}%)

Syllabus Progress: {syllabus_progress.get('completed', 0)}/{syllabus_progress.get('total', 0)} ({syllabus_progress.get('percentage', 0)}%)

Provide:
1. Predicted overall grade (A+, A, B+, B, C+, C, D, F)
2. Confidence level (High/Medium/Low)
3. Key factors affecting performance
4. Recommendations for improvement

Format as JSON:
{{
  "predictedGrade": "A|B+|B|C+|C|D|F",
  "confidence": "High|Medium|Low",
  "factors": ["factor1", "factor2"],
  "recommendations": ["recommendation1", "recommendation2"]
}}"""
    
    response = await call_openrouter(
        prompt,
        "You are an expert educational analyst predicting student performance based on data."
    )
    
    try:
        json_match = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_match)
        return parsed
    except Exception as e:
        logger.error(f"Error parsing forecast: {str(e)}")
        return {
            "predictedGrade": "B",
            "confidence": "Medium",
            "factors": ["Based on current performance trends"],
            "recommendations": ["Continue current study habits", "Improve attendance"]
        }


async def generate_teacher_insights(
    teacher_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate teacher insights"""
    prompt = f"""Analyze this teacher's performance:

Subject: {teacher_data.get('subject', 'N/A')}
Class Average: {teacher_data.get('classAverage', 0)}%
Student Count: {teacher_data.get('studentCount', 0)}
Weak Students: {teacher_data.get('weakStudents', 0)}
Attendance Rate: {teacher_data.get('attendanceRate', 0)}%

Provide:
1. Overall analysis
2. Strengths
3. Weaknesses
4. Recommendations

Format as JSON:
{{
  "analysis": "overall analysis text",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"]
}}"""
    
    response = await call_openrouter(
        prompt,
        "You are an expert educational analyst providing insights on teacher performance."
    )
    
    try:
        json_match = response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_match)
        return parsed
    except Exception as e:
        logger.error(f"Error parsing insights: {str(e)}")
        return {
            "analysis": "Analysis completed",
            "strengths": [],
            "weaknesses": [],
            "recommendations": []
        }

