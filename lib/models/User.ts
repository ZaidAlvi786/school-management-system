import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  role: "principal" | "teacher" | "student" | "parent" | "admin";
  name: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["principal", "teacher", "student", "parent", "admin"],
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

