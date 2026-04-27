import mongoose from "mongoose";
import academicExamModel from "./academicExam.model";

/* ================= CREATE ================= */
export const createExamService = async ({ data, user }: any) => {
  const { name, examType, totalMarks, startDate, endDate } = data;

  /* ===== VALIDATION ===== */
  if (!name) throw new Error("Exam name required");
  if (!examType) throw new Error("examType required");
  if (!totalMarks) throw new Error("totalMarks required");
  if (!startDate || !endDate) throw new Error("Exam dates required");

  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("End date must be after start date");
  }

  /* ===== CREATE ===== */
  const exam = await academicExamModel.create({
    name,
    examType,
    totalMarks: Number(totalMarks),
    startDate,
    endDate,
    academicYearId: user.academicYearId,
    schoolId: user.schoolId,
    createdById: user._id || user.id,
  });

  return exam;
};

/* ================= GET ================= */
export const getExamsService = async ({ schoolId, academicYearId }: any) => {
  return await academicExamModel
    .find({
      schoolId,
      $or: [
        { academicYearId },
        { academicYearId: { $exists: false } },
        { academicYearId: null },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();
};

/* ================= UPDATE ================= */
export const updateExamService = async ({ id, data, user }: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid exam id");
  }

  const updatePayload: any = {
    ...data,
    totalMarks: Number(data.totalMarks),
  };

  if (data.startDate && data.endDate) {
    if (new Date(data.endDate) < new Date(data.startDate)) {
      throw new Error("End date must be after start date");
    }
  }

  const exam = await academicExamModel.findOneAndUpdate(
    {
      _id: id,
      schoolId: user.schoolId,
      $or: [
        { academicYearId: user.academicYearId },
        { academicYearId: { $exists: false } },
        { academicYearId: null },
      ],
    },
    updatePayload,
    { new: true },
  );

  if (!exam) throw new Error("Exam not found");

  return exam;
};

/* ================= DELETE ================= */
export const deleteExamService = async ({ id, user }: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid exam id");
  }

  const exam = await academicExamModel.findOneAndDelete({
    _id: id,
    schoolId: user.schoolId,
    $or: [
      { academicYearId: user.academicYearId },
      { academicYearId: { $exists: false } },
      { academicYearId: null },
    ],
  });

  if (!exam) throw new Error("Exam not found");

  return true;
};
