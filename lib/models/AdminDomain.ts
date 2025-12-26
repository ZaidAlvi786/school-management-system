import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminDomain extends Document {
  domain: string; // e.g., "schooladmin.com"
  description?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId; // User who created this domain
  createdAt: Date;
  updatedAt: Date;
}

const AdminDomainSchema = new Schema<IAdminDomain>(
  {
    domain: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const AdminDomain: Model<IAdminDomain> =
  mongoose.models.AdminDomain || mongoose.model<IAdminDomain>("AdminDomain", AdminDomainSchema);

export default AdminDomain;

