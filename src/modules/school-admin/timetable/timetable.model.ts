import mongoose, { Schema } from "mongoose";

const timetableSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },

    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    day: {
      type: String,
      required: true,
      index: true,
    },

    periodId: {
      type: Schema.Types.ObjectId,
      ref: "Period",
      required: true,
      index: true,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    startMinutes: {
      type: Number,
      required: true,
    },

    endMinutes: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

/* ===================================================== */
/* 🔥 SLOT UNIQUENESS (MOST IMPORTANT) */
/* ===================================================== */

timetableSchema.index(
  {
    schoolId: 1,
    classId: 1,
    sectionId: 1,
    day: 1,
    periodId: 1,
  },
  { unique: true }, // 💥 no duplicate slot
);

/* ===================================================== */
/* 🔥 TEACHER FAST CONFLICT INDEX */
/* ===================================================== */

timetableSchema.index({
  schoolId: 1,
  teacherId: 1,
  day: 1,
  startMinutes: 1,
  endMinutes: 1,
});

/* ===================================================== */
/* 🔥 OPTIONAL QUERY SPEED */
/* ===================================================== */

timetableSchema.index({
  schoolId: 1,
  classId: 1,
  day: 1,
});

export default mongoose.model("Timetable", timetableSchema);
