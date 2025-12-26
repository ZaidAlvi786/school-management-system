import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminDomainRequest extends Document {
  email: string;
  domain: string; // Requested domain
  organization: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminDomainRequestSchema = new Schema<IAdminDomainRequest>(
  {
    email: { type: String, required: true },
    domain: { type: String, required: true, lowercase: true },
    organization: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

const AdminDomainRequest: Model<IAdminDomainRequest> =
  mongoose.models.AdminDomainRequest ||
  mongoose.model<IAdminDomainRequest>("AdminDomainRequest", AdminDomainRequestSchema);

export default AdminDomainRequest;

