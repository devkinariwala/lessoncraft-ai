import mongoose, { Schema } from "mongoose";
const sourceSchema = new Schema(
  {
    title: String,
    url: String,
    sourceType: String,
    description: String,
    author: String,
  },
  { _id: false },
);
const reportSchema = new Schema(
  {
    layer: String,
    status: String,
    score: Number,
    summary: String,
    issues: [
      {
        severity: String,
        location: String,
        issue: String,
        recommendation: String,
      },
    ],
    checkedAt: String,
  },
  { _id: false },
);
const lessonSchema = new Schema(
  {
    title: { type: String, required: true },
    objective: { type: String, required: true },
    lesson: { type: Schema.Types.Mixed, required: true },
    researchWarnings: [String],
    researchQC: reportSchema,
    instructionalQC: reportSchema,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
export const LessonModel = mongoose.model("Lesson", lessonSchema);
