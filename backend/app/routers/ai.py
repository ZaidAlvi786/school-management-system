"""
AI endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.core.auth import require_teacher, require_admin_or_principal, CurrentUser
from app.services.ai_service import (
    generate_homework_questions,
    generate_exam_paper,
    grade_student_answer,
    predict_student_performance,
    generate_teacher_insights
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Homework Generation ============

class GenerateHomeworkRequest(BaseModel):
    subject: str
    topic: str
    difficulty: str
    count: int


@router.post("/homework")
async def generate_homework(
    request: GenerateHomeworkRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Generate homework questions using AI"""
    try:
        questions = await generate_homework_questions(
            request.subject,
            request.topic,
            request.difficulty,
            request.count
        )
        
        return questions
    
    except Exception as e:
        logger.error(f"Error generating homework: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate homework: {str(e)}"
        )


# ============ Exam Paper Generation ============

class GeneratePaperRequest(BaseModel):
    subject: str
    classLevel: str
    examType: str
    topics: List[str]
    totalMarks: int = 100


@router.post("/generate-paper")
async def generate_paper(
    request: GeneratePaperRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Generate exam paper using AI"""
    try:
        paper = await generate_exam_paper(
            request.subject,
            request.classLevel,
            request.examType,
            request.topics,
            request.totalMarks
        )
        
        return paper
    
    except Exception as e:
        logger.error(f"Error generating paper: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate paper: {str(e)}"
        )


# ============ AI Grading ============

class GradeAnswerRequest(BaseModel):
    studentAnswer: str
    correctAnswer: str
    question: str
    maxMarks: int


@router.post("/grade")
async def grade_answer(
    request: GradeAnswerRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Grade student answer using AI"""
    try:
        result = await grade_student_answer(
            request.studentAnswer,
            request.correctAnswer,
            request.question,
            request.maxMarks
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error grading answer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to grade answer: {str(e)}"
        )


# ============ Student Forecast ============

class ForecastRequest(BaseModel):
    pastGrades: List[Dict[str, Any]]
    attendance: Dict[str, Any]
    syllabusProgress: Dict[str, Any]


@router.post("/forecast")
async def predict_performance(
    request: ForecastRequest,
    user: CurrentUser = Depends(require_teacher)
):
    """Predict student performance"""
    try:
        student_data = {
            "pastGrades": request.pastGrades,
            "attendance": request.attendance,
            "syllabusProgress": request.syllabusProgress
        }
        
        result = await predict_student_performance(student_data)
        
        return result
    
    except Exception as e:
        logger.error(f"Error predicting performance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to predict performance: {str(e)}"
        )


# ============ Teacher Insights ============

class InsightsRequest(BaseModel):
    type: str
    data: Dict[str, Any]


@router.post("/insights")
async def generate_insights(
    request: InsightsRequest,
    user: CurrentUser = Depends(require_admin_or_principal)
):
    """Generate AI insights"""
    try:
        if request.type == "teacher":
            result = await generate_teacher_insights(request.data)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid insight type: {request.type}"
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate insights: {str(e)}"
        )

