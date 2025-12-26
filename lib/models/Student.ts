import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
  user: mongoose.Types.ObjectId;
  rollNumber: string;
  admissionNumber: string;
  class: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId;
  parent: mongoose.Types.ObjectId;
  dateOfBirth: Date;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rollNumber: { type: String, required: true },
    admissionNumber: { type: String, required: true, unique: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "Parent" },
    dateOfBirth: { type: Date, required: true },
    address: { type: String },
  },
  { timestamps: true }
);

const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);

export default Student;

