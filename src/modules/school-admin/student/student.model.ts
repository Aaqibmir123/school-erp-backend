  import mongoose from "mongoose"

  const studentSchema = new mongoose.Schema(
    {
      schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },

      academicYearId: {
        type: String,
        index: true,
      },

      firstName: {
        type: String,
        required: true,
      },

      lastName: String,

      gender: {
        type: String,
        enum: ["male", "female"],
      },

      classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
        index: true,
      },

      sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
        default: null,
      },

      rollNumber: Number,

      fatherName: String,
      parentPhone: String,
    },
    { timestamps: true }
  )

  studentSchema.index({
    schoolId: 1,
    classId: 1,
    sectionId: 1,
    rollNumber: 1,
  })

  export const StudentModel = mongoose.model("Student", studentSchema)