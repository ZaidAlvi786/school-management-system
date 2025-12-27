import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICampus extends Document {
  name: string;
  school: mongoose.Types.ObjectId;
  address: string;
  incharge?: mongoose.Types.ObjectId;
  principal?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampusSchema = new Schema<ICampus>(
  {
    name: { type: String, required: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    address: { type: String, required: true },
    incharge: { type: Schema.Types.ObjectId, ref: "Teacher", required: false },
    principal: { type: Schema.Types.ObjectId, ref: "Principal", required: false },
  },
  {
    timestamps: true
  }
);

const Campus: Model<ICampus> = mongoose.models.Campus || mongoose.model<ICampus>("Campus", CampusSchema);

export default Campus;

