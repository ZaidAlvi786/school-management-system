import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIInsight extends Document {
  type: "weak_student" | "weak_teacher" | "syllabus_delay" | "class_improvement" | "early_warning";
  school?: mongoose.Types.ObjectId;
  class?: mongoose.Types.ObjectId;
  student?: mongoose.Types.ObjectId;
  teacher?: mongoose.Types.ObjectId;
  subject?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  recommendations: string[];
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AIInsightSchema = new Schema<IAIInsight>(
  {
    type: {
      type: String,
      enum: ["weak_student", "weak_teacher", "syllabus_delay", "class_improvement", "early_warning"],
      required: true,
    },
    school: { type: Schema.Types.ObjectId, ref: "School" },
    class: { type: Schema.Types.ObjectId, ref: "Class" },
    student: { type: Schema.Types.ObjectId, ref: "Student" },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher" },
    subject: { type: Schema.Types.ObjectId, ref: "Subject" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    recommendations: [{ type: String }],
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const AIInsight: Model<IAIInsight> = mongoose.models.AIInsight || mongoose.model<IAIInsight>("AIInsight", AIInsightSchema);

export default AIInsight;

