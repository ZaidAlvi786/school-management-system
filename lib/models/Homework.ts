import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHomework extends Document {
  title: string;
  description: string;
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  dueDate: Date;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HomeworkSchema = new Schema<IHomework>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    dueDate: { type: Date, required: true },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Homework: Model<IHomework> = mongoose.models.Homework || mongoose.model<IHomework>("Homework", HomeworkSchema);

export default Homework;

