import Exam from "./exam.model";

import mongoose from "mongoose";

export const createExamService = async (data: any, user: any) => {
  const toObjectId = (val: any) => {
    if (!val) return null;
    if (!mongoose.Types.ObjectId.isValid(val)) return null;
    return new mongoose.Types.ObjectId(val);
  };

  const classId = toObjectId(data.classId);
  const sectionId = toObjectId(data.sectionId);
  const subjectId = toObjectId(data.subjectId);
  const schoolId = toObjectId(user.schoolId);

  /* ================= VALIDATION ================= */

  if (!classId) throw new Error("Class is required");
  if (!sectionId) throw new Error("Section is required");

  /* ================= DUPLICATE CHECK 💣 ================= */

  const existing = await Exam.findOne({
    schoolId,
    classIds: classId,
    sectionId,
    subjectId: subjectId || null,
    examType: data.examType,
    date: new Date(data.date),
    createdById: user.teacherId || user.id,
  }).lean();

  if (existing) {
    throw new Error("Exam already exists for this section & subject");
  }

  /* ================= CREATE ================= */

  const payload = {
    name: data.name?.trim(),
    examType: data.examType,
    subjectId: subjectId || null,
    sectionId, // 💣 IMPORTANT
    chapter: data.chapter || "",
    totalMarks: Number(data.totalMarks),
    date: new Date(data.date),

    classIds: [classId],

    schoolId,
    createdByRole: user.role?.toLowerCase(),
    createdById: user.teacherId || user.id,
  };

  return await Exam.create(payload);
};

export const getMyExamsService = async (teacherId: string) => {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error("Invalid teacherId");
  }

  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

  const exams = await Exam.find({
    createdById: teacherObjectId,
  })
    .populate("classIds", "name")
    .populate("sectionId", "name")
    .populate("subjectId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return exams;
};

export const updateExamService = async (id: string, data: any) => {
  return await Exam.findByIdAndUpdate(id, data, { new: true });
};

/* ================= DELETE ================= */
export const deleteExamService = async (id: string) => {
  return await Exam.findByIdAndDelete(id);
};
