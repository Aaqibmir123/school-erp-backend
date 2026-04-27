import Exam from "./exam.model";

import mongoose from "mongoose";

const normalizeExamType = (value: string) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const aliases: Record<string, string> = {
    class_test: "class_test",
    classtest: "class_test",
    written: "written",
    oral: "oral",
    quiz: "quiz",
    unit_test: "unit_test",
    unittest: "unit_test",
    mid_term: "mid_term",
    midterm: "mid_term",
    final: "final",
  };

  return aliases[normalized] || normalized;
};

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
  const examType = normalizeExamType(data.examType);

  /* ================= VALIDATION ================= */

  if (!classId) throw new Error("Class is required");
  if (!sectionId) throw new Error("Section is required");

  /* ================= DUPLICATE CHECK 💣 ================= */

  const existing = await Exam.findOne({
    schoolId,
    classIds: classId,
    sectionId,
    subjectId: subjectId || null,
    examType,
    date: new Date(data.date),
    createdById: user.teacherId || user.id,
  }).lean();

  if (existing) {
    throw new Error("Exam already exists for this section & subject");
  }

  /* ================= CREATE ================= */

  const payload = {
    name: data.name?.trim(),
    examType,
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
  const updatePayload = {
    ...data,
    ...(data.examType ? { examType: normalizeExamType(data.examType) } : {}),
  };

  return await Exam.findByIdAndUpdate(id, updatePayload, { new: true });
};

/* ================= DELETE ================= */
export const deleteExamService = async (id: string) => {
  return await Exam.findByIdAndDelete(id);
};
