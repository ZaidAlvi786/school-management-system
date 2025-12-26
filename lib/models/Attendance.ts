import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  student: mongoose.Types.ObjectId;
  date: Date;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      required: true,
    },
    remarks: { type: String },
    markedBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });

const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;

