import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMaterial extends Document {
  title: string;
  description: string;
  subject: mongoose.Types.ObjectId;
  class: mongoose.Types.ObjectId;
  fileUrl: string;
  fileType: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    title: { type: String, required: true },
    description: { type: String },
    subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

const Material: Model<IMaterial> = mongoose.models.Material || mongoose.model<IMaterial>("Material", MaterialSchema);

export default Material;

