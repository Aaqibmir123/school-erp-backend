import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  isActive: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("AcademicYear", academicYearSchema);
