import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaper extends Document {
  title: string;
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  syllabusInfo: string;
  samplePaperUrl?: string; // Base64 or URL of uploaded sample
  generatedContent: string; // The generated paper content
  docxFileUrl?: string; // Base64 encoded docx file
  generatedBy: mongoose.Types.ObjectId; // Teacher ID
  createdAt: Date;
  updatedAt: Date;
}

const PaperSchema = new Schema<IPaper>(
  {
    title: { type: String, required: true },
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    syllabusInfo: { type: String, required: true },
    samplePaperUrl: { type: String },
    generatedContent: { type: String, required: true },
    docxFileUrl: { type: String },
    generatedBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

const Paper: Model<IPaper> = mongoose.models.Paper || mongoose.model<IPaper>("Paper", PaperSchema);

export default Paper;




