import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISection extends Document {
  name: string;
  class: mongoose.Types.ObjectId;
  capacity: number;
  currentStrength: number;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    name: { type: String, required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    capacity: { type: Number, required: true, default: 40 },
    currentStrength: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Section: Model<ISection> = mongoose.models.Section || mongoose.model<ISection>("Section", SectionSchema);

export default Section;

