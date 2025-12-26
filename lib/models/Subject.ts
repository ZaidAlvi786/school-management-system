import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  name: string;
  code: string;
  class: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);

export default Subject;

