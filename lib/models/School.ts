import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISchool extends Document {
  name: string;
  code: string;
  address: string;
  city: string;
  province: string;
  principal?: mongoose.Types.ObjectId;
  type: "government" | "private";
  domain?: string;
  certificateType?: "upload" | "number";
  certificateNumber?: string;
  certificateUrl?: string;
  registrationStatus?: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    principal: { type: Schema.Types.ObjectId, ref: "Principal", required: false },
    type: { type: String, enum: ["government", "private"], required: true },
    domain: { type: String, unique: true, sparse: true, lowercase: true },
    certificateType: { type: String, enum: ["upload", "number"] },
    certificateNumber: { type: String },
    certificateUrl: { type: String },
    registrationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

// Delete the model if it exists to force recompilation with new schema
if (mongoose.models.School) {
  delete mongoose.models.School;
}

const School: Model<ISchool> = mongoose.model<ISchool>("School", SchoolSchema);

export default School;

