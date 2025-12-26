import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGrade extends Document {
  student: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  examType: "quiz" | "assignment" | "midterm" | "final" | "project";
  marks: number;
  totalMarks: number;
  percentage: number;
  teacher: mongoose.Types.ObjectId;
  remarks?: string;
  aiSuggestedGrade?: number;
  aiExplanation?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GradeSchema = new Schema<IGrade>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    examType: {
      type: String,
      enum: ["quiz", "assignment", "midterm", "final", "project"],
      required: true,
    },
    marks: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    remarks: { type: String },
    aiSuggestedGrade: { type: Number },
    aiExplanation: { type: String },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

const Grade: Model<IGrade> = mongoose.models.Grade || mongoose.model<IGrade>("Grade", GradeSchema);

export default Grade;

