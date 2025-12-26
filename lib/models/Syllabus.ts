import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISyllabus extends Document {
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  topic: string;
  status: "pending" | "in-progress" | "completed";
  startDate?: Date;
  completionDate?: Date;
  notes?: string;
  materials?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusSchema = new Schema<ISyllabus>(
  {
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    topic: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    startDate: { type: Date },
    completionDate: { type: Date },
    notes: { type: String },
    materials: [{ type: String }],
  },
  { timestamps: true }
);

const Syllabus: Model<ISyllabus> = mongoose.models.Syllabus || mongoose.model<ISyllabus>("Syllabus", SyllabusSchema);

export default Syllabus;

