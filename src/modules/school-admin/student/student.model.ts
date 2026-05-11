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

      dateOfBirth: {
        type: Date,
        default: null,
      },

      admissionDate: {
        type: Date,
        default: null,
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
      profileImage: String,

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      parentUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      status: {
        type: String,
        enum: ["active", "disabled"],
        default: "active",
        index: true,
      },
    },
    { timestamps: true }
  )

  studentSchema.index({
    schoolId: 1,
    classId: 1,
    sectionId: 1,
    rollNumber: 1,
  })

  studentSchema.index({ userId: 1 })

  export const StudentModel = mongoose.model("Student", studentSchema)
