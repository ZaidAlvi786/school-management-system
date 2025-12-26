import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClass extends Document {
  name: string;
  level: number;
  campus: mongoose.Types.ObjectId;
  classIncharge: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    level: { type: Number, required: true },
    campus: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    classIncharge: { type: Schema.Types.ObjectId, ref: "Teacher" },
  },
  { timestamps: true }
);

const Class: Model<IClass> = mongoose.models.Class || mongoose.model<IClass>("Class", ClassSchema);

export default Class;

