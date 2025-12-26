import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPrincipal extends Document {
  user: mongoose.Types.ObjectId;
  employeeId: string;
  school?: mongoose.Types.ObjectId;
  qualification: string;
  experience: number;
  createdAt: Date;
  updatedAt: Date;
}

const PrincipalSchema = new Schema<IPrincipal>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: false },
    qualification: { type: String },
    experience: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Principal: Model<IPrincipal> = mongoose.models.Principal || mongoose.model<IPrincipal>("Principal", PrincipalSchema);

export default Principal;

