import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDomain extends Document {
  domain: string;
  school: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>(
  {
    domain: { type: String, required: true, unique: true, lowercase: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Domain: Model<IDomain> = mongoose.models.Domain || mongoose.model<IDomain>("Domain", DomainSchema);

export default Domain;

