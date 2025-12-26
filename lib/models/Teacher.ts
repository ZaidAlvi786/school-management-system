import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeacher extends Document {
  user: mongoose.Types.ObjectId;
  employeeId: string;
  school: mongoose.Types.ObjectId;
  subjects: mongoose.Types.ObjectId[];
  qualification: string;
  experience: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    qualification: { type: String },
    experience: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Teacher: Model<ITeacher> = mongoose.models.Teacher || mongoose.model<ITeacher>("Teacher", TeacherSchema);

export default Teacher;

