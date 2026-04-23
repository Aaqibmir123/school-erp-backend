import mongoose, { Schema } from "mongoose";

const homeworkSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    /* 💣 NEW FIELD */
    maxMarks: {
      type: Number,
      default: 0,
      min: 0,
    },

    isGeneral: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
  },
  { timestamps: true },
);

/* 💣 INDEX OPTIMIZATION */
homeworkSchema.index({
  schoolId: 1,
  classId: 1,
  sectionId: 1,
  subjectId: 1,
});

/* 💣 AUTO EXPIRE (OPTIONAL ADVANCED) */
// homeworkSchema.pre("save", function (next) {
//   if (this.dueDate < new Date()) {
//     this.status = "expired";
//   }
//   next();
// });

export const HomeworkModel =
  mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);
