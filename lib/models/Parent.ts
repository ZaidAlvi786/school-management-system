import mongoose, { Schema, Document, Model } from "mongoose";

export interface IParent extends Document {
  user: mongoose.Types.ObjectId;
  cnic: string;
  occupation: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    cnic: { type: String, required: true, unique: true },
    occupation: { type: String },
  },
  { timestamps: true }
);

const Parent: Model<IParent> = mongoose.models.Parent || mongoose.model<IParent>("Parent", ParentSchema);

export default Parent;

